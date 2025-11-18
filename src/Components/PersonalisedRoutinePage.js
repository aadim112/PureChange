import React, { useEffect, useState, useMemo } from 'react';
import styles from './PersonalisedRoutinePage.module.css';
import Navbar from './Navbar';
import { ReactComponent as Goals } from "../assets/Goals.svg"
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase'; // your firebase RTDB export
import { ref as dbRef, get, set, update } from 'firebase/database';
import { generateWeeklyRoutine } from '../services/llmService'; // new helper in llmService
import { showOtherContent } from '../services/contentService'; // to fetch tips
import dayjs from 'dayjs';
import UpgradePopup from './UpgradePlanPopup';

export default function PersonalisedRoutinePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uid, setUid] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [weeklyRoutine, setWeeklyRoutine] = useState(null);
  const [todaySchedule, setTodaySchedule] = useState(null);
  const [todayDiet, setTodayDiet] = useState(null);
  const [advantages, setAdvantages] = useState(null);
  const [healthTip, setHealthTip] = useState(null);
  const [foodTip, setFoodTip] = useState(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const [dailyData, setDailyData] = useState(null); // holds persisted per-day choices
  const [error, setError] = useState(null);
  
  // Upgrade Popup State
  const [upgradePopupData, setUpgradePopupData] = useState({
    show: false,
    requiredPlan: ''
  });

  const weekDays = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  const todayName = useMemo(() => dayjs().format('dddd'), []); // e.g., "Monday"
  const todayDateKey = useMemo(() => dayjs().format('YYYY-MM-DD'), []);

  useEffect(() => {
    // assume userId stored in localStorage as in other pages
    const id = localStorage.getItem('userId');
    setUid(id || null);
  }, []);

  useEffect(() => {
    if (!uid) {
      // no user: try to still show local routine if exists (non-persisted flow)
      const localRoutine = localStorage.getItem('personalizedRoutine');
      const localDaily = localStorage.getItem('personalizedRoutineDaily');
      if (localRoutine) {
        const obj = JSON.parse(localRoutine);
        setWeeklyRoutine(obj);
        setAdvantages(obj.advantages || null);
        setTodaySchedule(obj[todayName] || null);
        setTodayDiet(obj.weeklyDiet ? obj.weeklyDiet[todayName] : null);
      }
      if (localDaily) {
        const dd = JSON.parse(localDaily);
        setDailyData(dd);
        setHealthTip(dd.healthTip || null);
        setFoodTip(dd.foodTip || null);
      }
      setLoading(false);
      return;
    }

    // main flow: fetch user profile, check if routine exists, if not call LLM and persist
    let cancelled = false;
    async function bootstrap() {
      try {
        setLoading(true);
        const userRef = dbRef(db, `users/${uid}`);
        const snap = await get(userRef);
        if (!snap || !snap.exists()) {
          setError("User profile not found.");
          setLoading(false);
          return;
        }
        const profile = snap.val();
        if (cancelled) return;
        setUserProfile(profile);

        // check if personalizedRoutine exists
        const routineRef = dbRef(db, `users/${uid}/personalizedRoutine`);
        const rSnap = await get(routineRef);
        let routineObj = rSnap && rSnap.exists() ? rSnap.val() : null;

        if (!routineObj) {
          // First time: call LLM to generate weekly routine
          // llmService.generateWeeklyRoutine expects a profile object (we implement it in llmService)
          const payload = {
            age: profile.age || profile.Age || null,
            gender: profile.gender || profile.Gender || null,
            goal: profile.goal || profile.Goal || null,
            healthScore: profile.healthScore || profile.HealthScore || null,
            height: profile.height || profile.Height || null,
            weight: profile.weight || profile.Weight || null,
            hobby: profile.hobby || profile.Hobby || null,
            religion: profile.religion || profile.Religion || null,
            // add any other fields that help LLM
          };

          const generated = await generateWeeklyRoutine(payload);
          // Validate: expect object with days Mon..Sun keys, advantages, weeklyDiet
          if (generated && generated.week) {
            routineObj = {
              ...generated, // should include week:{Monday: [...], ...}, advantages, weeklyDiet:{}
              meta: { createdAt: new Date().toISOString() }
            };
            // persist to RTDB
            await set(dbRef(db, `users/${uid}/personalizedRoutine`), routineObj);
          } else {
            console.warn("LLM returned unexpected shape for routine:", generated);
            // fallback simple template
            routineObj = createFallbackRoutine(payload);
            await set(dbRef(db, `users/${uid}/personalizedRoutine`), routineObj);
          }
        }

        // store in state and compute today's schedule
        setWeeklyRoutine(routineObj);
        setAdvantages(routineObj.advantages || null);
        const daySchedule = (routineObj.week && routineObj.week[todayName]) ? routineObj.week[todayName] : null;
        setTodaySchedule(daySchedule);
        setTodayDiet(routineObj.weeklyDiet ? routineObj.weeklyDiet[todayName] : null);

        // Daily tips logic: fetch tips maps and persist today's picks under users/{uid}/dailyData/dailyRoutineData
        const dailyRef = dbRef(db, `users/${uid}/dailyData/dailyRoutineData`);
        const dailySnap = await get(dailyRef);
        const prevDaily = dailySnap && dailySnap.exists() ? dailySnap.val() : {};

        // If today's tips already selected, reuse
        if (prevDaily.date === todayDateKey && prevDaily.healthTip && prevDaily.foodTip) {
          setDailyData(prevDaily);
          setHealthTip(prevDaily.healthTip);
          setFoodTip(prevDaily.foodTip);
        } else {
          // fetch tip pools
          const healthMap = await showOtherContent('health-tips'); // returns map id->{actual_content}
          const foodMap = await showOtherContent('food-tips');

          const chooseNonRepeating = (pool, prevId) => {
            if (!pool) return null;
            const entries = Object.entries(pool || {});
            if (entries.length === 0) return null;
            // remove prevId if possible
            const filtered = entries.filter(([id]) => id !== prevId);
            const final = filtered.length ? filtered : entries;
            const pick = final[Math.floor(Math.random() * final.length)];
            return pick ? { id: pick[0], actual_content: pick[1].actual_content } : null;
          };

          const prevHealthId = prevDaily && prevDaily.healthTip ? prevDaily.healthTip.id : null;
          const prevFoodId = prevDaily && prevDaily.foodTip ? prevDaily.foodTip.id : null;

          const hPick = chooseNonRepeating(healthMap, prevHealthId);
          const fPick = chooseNonRepeating(foodMap, prevFoodId);

          const newDaily = {
            date: todayDateKey,
            healthTip: hPick,
            foodTip: fPick
          };

          await update(dbRef(db, `users/${uid}/dailyData/dailyRoutineData`), newDaily);
          setDailyData(newDaily);
          setHealthTip(hPick);
          setFoodTip(fPick);
        }

      } catch (err) {
        console.error("PersonalisedRoutinePage bootstrap error:", err);
        setError('Failed to load routine. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, [uid, todayName, todayDateKey]);

  // fallback generator if LLM fails / returns bad structure
  function createFallbackRoutine(profile) {
    const week = {};
    const sampleDay = [
      { time: "05:30", activity: "Wakeup & Hydration" },
      { time: "06:00", activity: "Light exercise / stretching" },
      { time: "06:30", activity: "Meditation (10-15 min)" },
      { time: "07:00", activity: "Breakfast" },
      { time: "08:00", activity: "Personal hygiene / prepare" },
      { time: "09:00", activity: "Work / School" },
      { time: "12:30", activity: "Lunch" },
      { time: "18:00", activity: "Gym / Hobby time" },
      { time: "20:00", activity: "Dinner" },
      { time: "22:30", activity: "Wind down / reading" },
      { time: "23:30", activity: "Sleep" },
    ];
    const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
    days.forEach(d => { week[d] = sampleDay; });
    const weeklyDiet = {};
    days.forEach(d => weeklyDiet[d] = `Balanced meals with protein emphasis (${profile.hobby || 'active'})`);
    return {
      week,
      advantages: "Improved energy, better sleep, consistent productivity and stress reduction.",
      weeklyDiet
    };
  }

  // UI helpers
  const openFullWeekPopup = () => setPopupOpen(true);
  const closeFullWeekPopup = () => setPopupOpen(false);

  // Determine whether regeneration is allowed (createdAt older than 7 days)
  const canRegenerate = useMemo(() => {
    try {
      const createdAt = weeklyRoutine && weeklyRoutine.meta && weeklyRoutine.meta.createdAt;
      if (!createdAt) return true; // if no creation timestamp, allow
      const daysPassed = dayjs().diff(dayjs(createdAt), 'day');
      return daysPassed >= 7;
    } catch (e) {
      return true;
    }
  }, [weeklyRoutine]);

  // Days remaining until regen is allowed (for tooltip)
  const daysUntilRegenerate = useMemo(() => {
    try {
      const createdAt = weeklyRoutine && weeklyRoutine.meta && weeklyRoutine.meta.createdAt;
      if (!createdAt) return 0;
      const daysPassed = dayjs().diff(dayjs(createdAt), 'day');
      return Math.max(0, 7 - daysPassed);
    } catch (e) {
      return 0;
    }
  }, [weeklyRoutine]);

  // Access Control Handlers
  const handleRegenerateClick = () => {
    const userType = userProfile?.UserType || userProfile?.userType || 'Free';
    
    if (userType !== 'Elite') {
      setUpgradePopupData({ show: true, requiredPlan: 'Elite' });
      return;
    }
    
    regenerateSchedule();
  };

  const handleFullWeekClick = () => {
    const userType = userProfile?.UserType || userProfile?.userType || 'Free';
    
    if (userType !== 'Elite') {
      setUpgradePopupData({ show: true, requiredPlan: 'Elite' });
      return;
    }

    openFullWeekPopup();
  };

  // Regenerate schedule handler
  const regenerateSchedule = async () => {
    // safety: don't run if not allowed
    if (!canRegenerate) return;

    try {
      setLoading(true);
      setError(null);

      // Build payload for generator from available userProfile (fallback to empty obj)
      const payload = {
        age: (userProfile && (userProfile.age || userProfile.Age)) || null,
        gender: (userProfile && (userProfile.gender || userProfile.Gender)) || null,
        goal: (userProfile && (userProfile.goal || userProfile.Goal)) || null,
        healthScore: (userProfile && (userProfile.healthScore || userProfile.HealthScore)) || null,
        height: (userProfile && (userProfile.height || userProfile.Height)) || null,
        weight: (userProfile && (userProfile.weight || userProfile.Weight)) || null,
        hobby: (userProfile && (userProfile.hobby || userProfile.Hobby)) || null,
        religion: (userProfile && (userProfile.religion || userProfile.Religion)) || null,
        dietPreference: (userProfile && (userProfile.dietPreference || userProfile.DietPreference)) || null
      };

      // Call generator
      const generated = await generateWeeklyRoutine(payload);
      if (!generated || !generated.week) {
        throw new Error('Generator returned invalid routine.');
      }

      // Compose routine object with new meta.createdAt
      const newRoutineObj = {
        ...generated,
        meta: { createdAt: new Date().toISOString() }
      };

      // Persist: to RTDB if uid present; otherwise localStorage
      if (uid) {
        await set(dbRef(db, `users/${uid}/personalizedRoutine`), newRoutineObj);
      } else {
        localStorage.setItem('personalizedRoutine', JSON.stringify(newRoutineObj));
      }

      // Update state and today's schedule/diet/advantages
      setWeeklyRoutine(newRoutineObj);
      setAdvantages(newRoutineObj.advantages || null);
      setTodaySchedule(newRoutineObj.week && newRoutineObj.week[todayName] ? newRoutineObj.week[todayName] : null);
      setTodayDiet(newRoutineObj.weeklyDiet ? newRoutineObj.weeklyDiet[todayName] : null);

    } catch (err) {
      console.error('Failed to regenerate routine:', err);
      setError('Failed to regenerate schedule. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles["personalised-routine-page"]}>
        <Navbar pageName="Personalised Routine" Icon={Goals} buttons={[{ label: "My Page", variant: "secondary", route: "/mypage" }, { label: "My Routine", variant: "primary", route: "/routine" }]} />
        <div className={styles["main-content"]}>
          <div className={styles["content-card"]}>
            <div className={styles["content-title"]}>Daily Routine</div>
            <div className={styles["info-card"]}>
              <div className={styles["info-content"]}><div>Loading...</div></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles["personalised-routine-page"]}>
      <Navbar pageName="Personalised Routine" Icon={Goals} buttons={[{ label: "My Page", variant: "secondary", route: "/mypage" }, { label: "My Routine", variant: "primary", route: "/routine" }]} />

      <div className={styles["main-content"]}>
        <div className={styles["content-card"]}>
          <div className={styles["content-title"]}>Daily Routine</div>

          {/* Today's Schedule */}
          <div className={styles["today-block"]}>
            <div className={styles["today-heading"]}>Today — {todayName}</div>
            <div className={styles["schedule-list"]}>
              {todaySchedule && Array.isArray(todaySchedule) ? (
                todaySchedule.map((slot, idx) => (
                  <div key={idx} className={styles["schedule-item"]}>
                    <div className={styles["slot-time"]}>{slot.time}</div>
                    <div className={styles["slot-activity"]}>{slot.activity}</div>
                  </div>
                ))
              ) : (
                <div className={styles["empty-state"]}>No schedule set for today.</div>
              )}
            </div>
          </div>

          {/* Motivation & Today's diet */}
          <div className={styles["cards"]}>
            <div className={styles["info-card"]}>
              <div className={styles["info-content"]}>
                <div className={styles["info-label"]}>Why follow this schedule?</div>
                <div className={styles["info-text"]}>{advantages || 'Following a structured routine improves sleep, energy, focus and mental wellbeing.'}</div>
              </div>
            </div>
            <div className={styles["info-card"]}>
              <div className={styles["info-content"]}>
                <div className={styles["info-label"]}>Today's Diet Measure</div>
                <div className={styles["info-text"]}>{todayDiet || 'Eat balanced meals; include lean protein and vegetables.'}</div>
              </div>
            </div>
          </div>

          {/* Health tip & Food tip */}
          <div className={styles["tips-row"]}>
            <div className={styles["tip-card"]}>
              <div className={styles["tip-heading"]}>Health Tip</div>
              <div className={styles["tip-body"]}>
                {healthTip ? (
                  <pre className={styles["tip-pre"]}>{healthTip.actual_content}</pre>
                ) : (
                  'Stay hydrated and take short movement breaks.'
                )}
              </div>
            </div>
            <div className={styles["tip-card"]}>
              <div className={styles["tip-heading"]}>Food Tip</div>
              <div className={styles["tip-body"]}>
                {foodTip ? (
                  <pre className={styles["tip-pre"]}>{foodTip.actual_content}</pre>
                ) : (
                  'Prefer whole grains and lean protein sources.'
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 12 }}>
            {/* Regenerate button on left */}
            <button
              className={styles["btn-secondary"]}
              onClick={handleRegenerateClick}
              disabled={loading}
              title={!canRegenerate ? `You can regenerate after ${daysUntilRegenerate} day(s)` : 'Regenerate schedule now'}
              style={{ minWidth: 160 }}
            >
              {canRegenerate ? 'Regenerate Schedule' : `Regenerate (${daysUntilRegenerate}d)` }
            </button>

            {/* View Full Week Schedule on right */}
            <button
              className={styles["btn-primary"]}
              onClick={handleFullWeekClick}
              disabled={loading}
              style={{ minWidth: 200 }}
            >
              View Full Week Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Full-week popup (chart + weekly diet table) */}
      {popupOpen && weeklyRoutine && (
        <div className={styles["modal-overlay"]}>
          <div className={styles["modal-content"]}>
            <div className={styles["modal-header"]}>
              <h3>Full Week Schedule</h3>
              <button className={styles["modal-close"]} onClick={closeFullWeekPopup}>Close</button>
            </div>

            <div className={styles["week-chart"]}>
              {/* simple grid: days as columns, time slots vertical */}
              <table className={styles["week-table"]}>
                <thead>
                  <tr>
                    <th>Time</th>
                    {weekDays.map(day => <th key={day}>{day}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {/* collect unique times across week to form rows */}
                  {generateTimeRows(weeklyRoutine.week).map((timeRow, rIdx) => (
                    <tr key={rIdx}>
                      <td className={styles["time-col"]}>{timeRow}</td>
                      {weekDays.map(day => {
                        const item = (weeklyRoutine.week && weeklyRoutine.week[day]) ? (weeklyRoutine.week[day].find(s => s.time === timeRow)) : null;
                        return <td key={day + '-' + timeRow}>{item ? item.activity : ''}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles["weekly-diet-table"]}>
              <h4>Weekly Diet Plan</h4>
              <table className={styles["diet-table"]}>
                <thead>
                  <tr><th>Day</th><th>Diet Plan</th></tr>
                </thead>
                <tbody>
                  {weekDays.map((day) => {
                    const diet = (weeklyRoutine.weeklyDiet && weeklyRoutine.weeklyDiet[day]) ? weeklyRoutine.weeklyDiet[day] : '';
                    return (
                      <tr key={day}>
                        <td>{day}</td>
                        <td className={styles['diet-td']}>
                          {diet} 
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {error && <div className={styles["error-banner"]}>{error}</div>}

      {/* Upgrade Popup */}
      <UpgradePopup 
        show={upgradePopupData.show} 
        onClose={() => setUpgradePopupData({ ...upgradePopupData, show: false })} 
        requiredPlan={upgradePopupData.requiredPlan} 
      />
    </div>
  );
}

/* Helper: from week object produce a sorted array of unique times across days */
/* Helper: from week object produce a sorted array of unique times across days
   — sorts by actual time of day (minutes), supports "hh:mm AM/PM" formats */
function generateTimeRows(weekObj = {}) {
  const timesMap = new Map(); // preserve one canonical string per time (first-seen)
  Object.values(weekObj).forEach(dayArr => {
    if (Array.isArray(dayArr)) {
      dayArr.forEach(slot => {
        if (slot && slot.time) {
          const t = String(slot.time).trim();
          // normalize multiple whitespace
          const norm = t.replace(/\s+/g, ' ');
          // If not already present, store it
          if (!timesMap.has(norm)) timesMap.set(norm, norm);
        }
      });
    }
  });

  // parse "hh:mm AM/PM" to minutes since midnight
  function parseToMinutes(t) {
    if (!t || typeof t !== 'string') return Number.POSITIVE_INFINITY;
    const s = t.trim().toUpperCase();
    // Try to match patterns like "06:30 AM", "6:30 AM", "12:00 PM"
    const m = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!m) {
      // try fallback: "HH:MM" 24h format
      const m2 = s.match(/^(\d{1,2}):(\d{2})$/);
      if (!m2) return Number.POSITIVE_INFINITY;
      const hh = parseInt(m2[1], 10);
      const mm = parseInt(m2[2], 10);
      return hh * 60 + mm;
    }
    let hh = parseInt(m[1], 10);
    const mm = parseInt(m[2], 10);
    const ampm = m[3];
    if (ampm === 'AM') {
      if (hh === 12) hh = 0;
    } else { // PM
      if (hh !== 12) hh = hh + 12;
    }
    return hh * 60 + mm;
  }

  // Build array of { timeString, minutes } and sort by minutes
  const arr = Array.from(timesMap.values()).map(ts => ({ time: ts, minutes: parseToMinutes(ts) }));
  arr.sort((a, b) => a.minutes - b.minutes || a.time.localeCompare(b.time));

  // return sorted time strings
  return arr.map(x => x.time);
}