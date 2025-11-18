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

        // Daily tips logic: fetch tips maps and persist today's picks under users/{uid}/dailyRoutineData
        const dailyRef = dbRef(db, `users/${uid}/dailyRoutineData`);
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

          await update(dbRef(db, `users/${uid}/dailyRoutineData`), newDaily);
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

          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button className={styles["btn-primary"]} onClick={openFullWeekPopup}>View Full Week Schedule</button>
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
                    {Object.keys(weeklyRoutine.week || {}).map(day => <th key={day}>{day}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {/* collect unique times across week to form rows */}
                  {generateTimeRows(weeklyRoutine.week).map((timeRow, rIdx) => (
                    <tr key={rIdx}>
                      <td className={styles["time-col"]}>{timeRow}</td>
                      {Object.keys(weeklyRoutine.week || {}).map(day => {
                        const item = (weeklyRoutine.week[day] || []).find(s => s.time === timeRow);
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
                  {Object.entries(weeklyRoutine.weeklyDiet || {}).map(([day, diet]) => (
                    <tr key={day}>
                      <td>{day}</td>
                      <td>{diet}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {error && <div className={styles["error-banner"]}>{error}</div>}
    </div>
  );
}

/* Helper: from week object produce a sorted array of unique times across days */
function generateTimeRows(weekObj = {}) {
  const times = new Set();
  Object.values(weekObj).forEach(dayArr => {
    if (Array.isArray(dayArr)) {
      dayArr.forEach(slot => {
        if (slot && slot.time) times.add(slot.time);
      });
    }
  });
  // sort times in HH:mm format
  const arr = Array.from(times);
  arr.sort((a, b) => a.localeCompare(b, undefined, { numeric: false, sensitivity: 'base' }));
  return arr;
}