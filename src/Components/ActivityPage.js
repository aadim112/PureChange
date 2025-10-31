import React, { useState, useEffect, use } from 'react';
import styles from './ActivityPage.module.css';
import Navbar from './Navbar';
import { ReactComponent as Flame } from "../assets/Flame.svg"
import { ReactComponent as NoSign } from "../assets/NoSign.svg"
import { ReactComponent as Sun } from "../assets/Sun.svg"
import { useNavigate } from 'react-router-dom';
import { ref, set, child, get, update, startAfter } from 'firebase/database';
import { db } from '../firebase';
import {
  getDailyData,
  initDailyDataIfMissing,
  updateDailyDataFields,
  toggleChecklistItem,
  handleDailyVerseLogic
} from "../services/contentService";

const getDailyMasterChecklist = () => {
  // For now, it's hardcoded.
  return {
    yoga: [false, "10 minutes Yoga"],
    drinkWater: [false, "Drink Water (2 liters)"],
    readMinutes: [false, "Read 15 minutes"],
    cycling: [false, "Cycling 10 minutes"]
  };
};

export async function syncDailyFields(userId, updates, setDailyData) {
  await updateDailyDataFields(userId, updates);
  await setDailyData(prev => ({ ...prev, ...updates }));
}

export default function ActivityPage() {
  const [activeTab, setActiveTab] = useState('activity');
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState('');
  const [userId, setUserId] = useState('');
  const [userData, setUserData] = useState({
      Name: null,
      UserName: '',
      Gender: '',
      Religion: '',
      streakNF: 0,
      streakNFB: 0,
      streakNFCM: 0,
      streakDT: 0,
      streakDTB: 0,
      streakDTCM: 0
  });
  const [showFapPopup, setShowFapPopup] = useState(false);
  const [popupTimeTag, setPopupTimeTag] = useState('');
  const [checklist, setChecklist] = useState({});
  const [dailyData, setDailyData] = useState({});
  const [todayVerse, setTodayVerse] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        // Fetch current month
        const date = new Date();
        const monthNames = [
          "January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"
        ];
        const currMon = `${monthNames[date.getMonth()]}${date.getFullYear()}`;
        setCurrentMonth(currMon);

        // Get userId from localStorage
        const storedUserId = localStorage.getItem("userId");
        if (!storedUserId) {
          navigate("/");
          return;
        }
        setUserId(storedUserId);

        // Fetch user data from Firebase
        const userRef = ref(db, `users/${storedUserId}`);
        const snapshot = await get(userRef);
        if (!snapshot.exists()) return;

        const data = snapshot.val();
        const formattedData = {
          Name: data.Name || '',
          UserName: data.UserName || '',
          Gender: data.Gender || '',
          Religion: data.Religion || '',
          streakNF: data.NoFapStreak.NFStreak || 0,
          streakNFB: data.NoFapStreak.BestStreak || 1,
          streakNFCM: data?.NoFapStreak?.MonthlyStreak?.[currMon] || 1,
          streakDT: data.DailyTaskStreak.DTStreak || 0,
          streakDTB: data.DailyTaskStreak.BestStreak || 0,
          streakDTCM: data?.DailyTaskStreak?.MonthlyStreak?.[currMon] || 0,
          UserType: data.UserType || ''
        };
        setUserData(formattedData);

        if (data.UserType === 'Normal') {
          navigate('/pricing');
          return;
        }

        // Initialize daily data only after user data ready
        const masterChecklist = getDailyMasterChecklist();
        const daily = await initDailyDataIfMissing(storedUserId, masterChecklist);
        setChecklist(daily.dailyChecklist || masterChecklist);
        setDailyData(daily);

        // Fetch today's verse
        const contentSnap = await get(ref(db, `content/religionalContent/${data.Religion}`));
        if (contentSnap.exists()) {
          const allVerses = contentSnap.val();
          const allVerseKeys = Object.keys(allVerses);
          const todayVerseKey = await handleDailyVerseLogic(storedUserId, allVerseKeys);
          setTodayVerse(allVerses[todayVerseKey]);
        }

        // Checking user subscription status
        if (data.UserType === 'Pro' || data.UserType === 'Elite') {
          const now = new Date();
          const expiryStr = daily.planExpiryDate;
          const expiryDate = new Date(expiryStr);

          if (now >= expiryDate) {
            const subscribe = window.confirm("Your subscription has expired. You have been downgraded to Normal plan. Would you like to renew your subscription?");
            if (subscribe) {
              const userTypeRef = ref(db, `users/${storedUserId}/UserType`);
              await set(userTypeRef, 'Normal');
              navigate('/pricing');
            } else {
              const userTypeRef = ref(db, `users/${storedUserId}/UserType`);
              await set(userTypeRef, 'Free');
              setUserData(prev => ({ ...prev, UserType: 'Free' }));
            }
          }
        }

        if (data.UserType === 'Free') {
          const now = new Date();
          const expiryStr = daily.planExpiryDate;
          const expiryDate = new Date(expiryStr);

          if (now >= expiryDate) {
            const expirydateRef = ref(db, `users/${storedUserId}/dailyData/planExpiryDate`);
            const snapshot = await get(expirydateRef);

            if (snapshot.exists()) {
              let expirydate = new Date(snapshot.val());
              expirydate.setDate(expirydate.getDate() + 30);
              const newExpiry = expirydate.toDateString();
              await set(expirydateRef, newExpiry);
            }
          }
        }

      } catch (e) {
        console.error("❌ Initialization failed:", e);
      }
    }

    init();
  }, []);

  useEffect(() => {
    if (!userData.Name || dailyData.fapLastAskedDate === undefined) return;

    if (dailyData.fapLastAskedDate === "" || dailyData.fapLastAskedDate === null) {
      setPopupTimeTag('morning');
      setShowFapPopup(true);
      return;
    }

    if (shouldAskFapQuestion()) {
      setShowFapPopup(true);
    }
  }, [userData.Name, dailyData.fapLastAskedDate]);

  useEffect(() => {
    if (userData.Name && dailyData.fapLastAskedDate) {
      checkDailyNFStreak();
    }
    if (userData.Name && dailyData.lastDTUpdateDate) {
      checkDailyDTStreak();
    }
  }, [userData.Name, dailyData.fapLastAskedDate, dailyData.lastDTUpdateDate]);

  useEffect(() => {
    if (checklist === undefined || dailyData.lastDTUpdateDate === undefined) return;
    const allComplete = Object.values(checklist).every(valueArray => valueArray[0] === true);

    const today = new Date().toDateString();
    const lastUpdate = dailyData.lastDTUpdateDate;

    if (allComplete && lastUpdate !== today) {
      updateDTStreak(false);
    }
  }, [checklist, dailyData.lastDTUpdateDate]);

  const shouldAskFapQuestion = () => {
    if (userData.streakNF === 0) return false;
    const now = new Date();
    const hour = now.getHours();
    const today = new Date().toDateString();

    const lastAskedDate = dailyData.fapLastAskedDate || null;
    const lastAskedTimeTag = dailyData.fapLastAskedTimeTag || null;

    if (lastAskedDate !== today && hour < 18) {
      setPopupTimeTag('morning');
      return true;
    }
    if (hour >= 18 && hour < 22 && !(lastAskedDate === today && lastAskedTimeTag === 'evening')) {
      setPopupTimeTag('evening');
      return true;
    }
    if (hour >= 22 && !(lastAskedDate === today && lastAskedTimeTag === 'night')) {
      setPopupTimeTag('night');
      return true;
    }
    return false;
  };

  const handleFapResponse = async (didFap) => {
    const today = new Date().toDateString();

    if (didFap) {
      updateNFStreak(true);
    }

    await syncDailyFields(userId, {
      fapLastAskedDate: today,
      fapLastAskedTimeTag: popupTimeTag
    }, setDailyData);

    setShowFapPopup(false);
  };

  const toggleChecklist = async (itemKey) => {
    const currentItem = checklist[itemKey];
    const newChecked = !currentItem[0];
    const newChecklist = { ...checklist, [itemKey]: [newChecked, currentItem[1]] };
    
    setChecklist(newChecklist); // instant UI update
    await toggleChecklistItem(userId, itemKey, newChecked, currentItem[1]);
    await syncDailyFields(userId, {
      dailyChecklist: newChecklist,
      lastChecklistUpdateDate: new Date().toDateString()
    }, setDailyData);
  };

  const checkDailyNFStreak = async () => {
    if (!userId) return;

    const today = new Date().toDateString();
    const lastUpdate = dailyData.lastNFUpdateDate;

    if (lastUpdate === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();

    if (lastUpdate === yesterdayString) {
      updateNFStreak(false);
    }
    else if (!lastUpdate || lastUpdate === "" || lastUpdate === undefined || lastUpdate === null) {
      await syncDailyFields(userId, { lastNFUpdateDate: today }, setDailyData);
    } 
    else {
      updateNFStreak(true);
    }
  };

  const checkDailyDTStreak = async () => {
    if (!userId) return; 
    const today = new Date().toDateString();
    const lastUpdate = dailyData.lastDTUpdateDate;

    if (lastUpdate === today) return;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();

    if (lastUpdate && lastUpdate !== yesterdayString && lastUpdate !== today) {
      updateDTStreak(true);
    }
  };

  const updateNFStreak = async (reset = false) => {
    try {
      const streakRef = ref(db, `users/${userId}/NoFapStreak/NFStreak`);
      const bestRef = ref(db, `users/${userId}/NoFapStreak/BestStreak`);
      const monthRef = ref(db, `users/${userId}/NoFapStreak/MonthlyStreak/${currentMonth}`);

      const newStreak = reset ? 0 : userData.streakNF + 1;
      let newBest = userData.streakNFB;

      let newMonthly = reset ? userData.streakNFCM : userData.streakNFCM + 1;

      if (!reset && newStreak > userData.streakNFB) {
        newBest = newStreak;
        set(bestRef, newBest);
      }
      set(monthRef, newMonthly);
      set(streakRef, newStreak);

      setUserData(prevData => ({
        ...prevData,
        streakNF: newStreak,
        streakNFB: newBest,
        streakNFCM: newMonthly
      }));
      await syncDailyFields(userId, { lastNFUpdateDate: new Date().toDateString() }, setDailyData);
    } catch (e) {
      console.error("Failed Updating No Fap Streak!", e);
    }
  };

  const updateDTStreak = async (reset = false) => {
    try {
      const streakRef = ref(db, `users/${userId}/DailyTaskStreak/DTStreak`);
      const bestRef = ref(db, `users/${userId}/DailyTaskStreak/BestStreak`);
      const monthRef = ref(db, `users/${userId}/DailyTaskStreak/MonthlyStreak/${currentMonth}`);
      let newMonthly = reset ? userData.streakDTCM : userData.streakDTCM + 1;

      const newStreak = reset ? 0 : userData.streakDT + 1;
      let newBest = userData.streakDTB;

      if (!reset && newStreak > userData.streakDTB) {
        newBest = newStreak;
        set(bestRef, newBest);
      }
      set(monthRef, newMonthly);
      set(streakRef, newStreak);

      setUserData(prevData => ({
        ...prevData,
        streakDT: newStreak,
        streakDTB: newBest,
        streakDTCM: newMonthly
      }));

      if (!reset) {
        await syncDailyFields(userId, { lastDTUpdateDate: new Date().toDateString() }, setDailyData);
      }
    } catch (e) {
      console.error("Failed Updating Daily Task Streak!", e);
    }
  };

  return (
    <div className={styles["activity-page"]}>
      <Navbar
        pageName="Activity"
        Icon={Flame}
        buttons={[
          { label: "Ranking", variant: "secondary", route: "/leaderboard" },
          { label: "My Routine", variant: "secondary", route: "/routine" },
          { label: "Activity", variant: "primary", route: "/activity" },
          { label: "My Page", variant: "secondary", route: "/mypage" },
        ]}
      />

      <div className={styles["body"]}>
        {/* Daily Question */}
        <div 
        className={styles["daily-question-card"]}
        onClick={() => navigate('/content')}
        >
          <h3 className={styles["daily-question-header"]}>Daily Question</h3>
          {todayVerse ? (
            <p className={styles["daily-question-text"]}>
              {todayVerse.question || todayVerse.actual_content || "Today's verse loaded!"}
            </p>
          ) : (
            <p className={styles["daily-question-text"]}>Loading today’s question...</p>
          )}
        </div>

        {/* Stats Section */}
        <div className={styles["stats-section"]}>
          {/* Tab Streak */}
          <div className={styles["stat-card"]}>
            <h3>Tab Streak</h3>
            <div className={styles["streak-content"]}>
              <div className={styles["streak-item"]}>
                <div className={styles["streak-name"]}>
                  <NoSign style={{width : 16 , height: 16}}></NoSign>
                  <p className={styles["no-streak"]}>No Fap Streak</p>
                </div>
                <div className={styles["days"]}>
                  <div className={styles["day-name"]}>
                    <Flame style={{width : 18 , height: 18}}></Flame>
                    <span className={styles["day-count"]}>{userData.streakNF} Days</span>
                  </div>
                  <div className={styles["day-info"]}>
                    <span className={styles["small"]}>Best: {userData.streakNFB}</span>
                    <span className={styles["small"]}>This month: {userData.streakNFCM}</span>
                  </div>
                </div>
              </div>
              <div className={styles["streak-item"]}>
                <div className={styles["streak-name"]}>
                  <Sun style={{width : 16 , height: 16}}></Sun>
                  <p className={styles["no-streak"]}>Daily Streak</p>
                </div>
                <div className={styles["days"]}>
                  <div className={styles["day-name"]}>
                    <Flame style={{width : 18 , height: 18}}></Flame>
                    <span className={styles["day-count"]}>{userData.streakDT} Days</span>
                  </div>
                  <div className={styles["day-info"]}>
                    <span className={styles["small"]}>Best: {userData.streakDTB}</span>
                    <span className={styles["small"]}>This month: {userData.streakDTCM}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className={styles["stat-card"]}>
            <h3>Checklist</h3>
            <div className={styles["checklist-items"]}>
              {Object.entries(checklist).map(([key, value]) => {
              const isChecked = value[0];
              const labelText = value[1];

                return (
                  <label className={styles["checkbox-item"]} key={key}>
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => toggleChecklist(key)}
                    />
                    <span>{labelText}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className={styles["content-section"]}>
          <h2>Content</h2>
          <div className={styles["content-grid"]}>
            {/* General Content */}
            <div className={styles["content-card"]}>
              <div className={styles["card-image"]}></div>
              <h4>General Content</h4>
              <p>Articles, tips, lessons</p>
              <button className={styles["explore-btn"]}>Browse</button>
            </div>

            {/* Pro Content */}
            <div className={styles["content-card"]}>
              <div className={styles["card-image"]}></div>
              <h4>Pro Content</h4>
              <p>Personalized routines, live videos</p>
              <button className={styles["explore-btn"]}>Explore</button>
            </div>

            {/* Elite Content */}
            <div className={styles["content-card"]}>
              <div className={styles["card-image"]}></div>
              <h4>Elite Content</h4>
              <p>Personal calls, Creator videos</p>
              <button className={styles["explore-btn"]}>Explore</button>
            </div>

            {/* Daily Quote */}
            <div className={styles["content-card"]}>
              <div className={styles["card-image"]}></div>
              <h4>Daily Quote</h4>
              <p>oh ! have a look</p>
              <button className={styles["explore-btn"]}>More Quotes</button>
            </div>
          </div>
        </div>
      </div>
      {showFapPopup && (
        <div className={styles["popup-overlay"]}>
          <div className={styles["popup-box"]}>
            <h3>Have you fapped today?</h3>
            <div className={styles["popup-buttons"]}>
              <button className={styles["yes-btn"]} onClick={() => handleFapResponse(true)}>Yes</button>
              <button className={styles["no-btn"]} onClick={() => handleFapResponse(false)}>No</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}