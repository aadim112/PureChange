import React, { useState, useEffect } from 'react';
import styles from './ActivityPage.module.css';
import Navbar from './Navbar';
import { ReactComponent as Flame } from "../assets/Flame.svg"
import { ReactComponent as NoSign } from "../assets/NoSign.svg"
import { ReactComponent as Sun } from "../assets/Sun.svg"
import { useNavigate } from 'react-router-dom';
import { ref, set, child, get, update, startAfter } from 'firebase/database';
import { db } from '../firebase';

const getDailyMasterChecklist = () => {
  // For now, it's hardcoded.
  return {
    drinkWater: [false, "Drink Water (2 liters)"],
    yoga: [false, "10 minutes Yoga"],
    readMinutes: [false, "Read 15 minutes"],
    cycling: [false, "Cycling 10 minutes"]
  };
};

export default function ActivityPage() {
  const [activeTab, setActiveTab] = useState('activity');
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState('');
  const [userId, setUserId] = useState('');
  const [userData, setUserData] = useState({
      Name: '',
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
  const [checklist, setChecklist] = useState(() => {
    const today = new Date().toDateString();
    const lastUpdate = localStorage.getItem('lastChecklistUpdateDate');
    
    const defaultChecklist = getDailyMasterChecklist();

    if (lastUpdate !== today) {
      localStorage.setItem('dailyChecklist', JSON.stringify(defaultChecklist));
      localStorage.setItem("lastChecklistUpdateDate", new Date().toDateString())
      return defaultChecklist;
    }

    const savedChecklist = localStorage.getItem('dailyChecklist');
    return savedChecklist ? JSON.parse(savedChecklist) : defaultChecklist;
  });

  useEffect(() => {
    fetchCurrentMonth();
  }, []);

  useEffect(() => {
    if (currentMonth) {
      fetchUserData();
    }
  }, [currentMonth]);

  useEffect(() => {
    if (userData.Name) {
      checkDailyNFStreak();
      checkDailyDTStreak();
    }
  }, [userData.Name]);

  useEffect(() => {
    if (userData.Name && shouldAskFapQuestion()) {
      setShowFapPopup(true);
    }
  }, [userData]);

  useEffect(() => {
    const allComplete = Object.values(checklist).every(valueArray => valueArray[0] === true);

    const today = new Date().toDateString();
    const lastUpdate = localStorage.getItem('lastDTUpdateDate');

    if (allComplete && lastUpdate !== today) {
      console.log("All daily tasks completed. Incrementing DT streak.");
      updateDTStreak(false);
    }
  }, [checklist]);

  const fetchCurrentMonth = () => {
    try {
      const date = new Date();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
      const curr_mon = String(monthNames[date.getMonth()]+date.getFullYear());
      
      setCurrentMonth(curr_mon);
    } catch(e){
      console.error("Error Fetching Current Month : ",e);
    }
  }

  const fetchUserData = async () => {
    try {
      const userId = localStorage.getItem('userId');
      setUserId(userId);
      console.log("User from Activity Page",userId);
      if (!userId) {
        navigate('/');
        return;
      }

      const userRef = ref(db, `users/${userId}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        const formattedData = {
          Name: data.Name || '',
          UserName: data.UserName || '',
          Gender: data.Gender || '',
          Religion: data.Religion || '',
          streakNF: data.NoFapStreak.NFStreak || 0,
          streakNFB: data.NoFapStreak.BestStreak || 0,
          streakNFCM: data?.NoFapStreak?.MonthlyStreak?.[currentMonth] || 0,
          streakDT: data.DailyTaskStreak.DTStreak || 0,
          streakDTB: data.DailyTaskStreak.BestStreak || 0,
          streakDTCM: data?.DailyTaskStreak?.MonthlyStreak?.[currentMonth] || 0,
        };
        setUserData(formattedData);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const shouldAskFapQuestion = () => {
    if (userData.streakNF === 0) return false;

    const now = new Date();
    const hour = now.getHours();
    const today = now.toDateString();

    // retrieve last asked times
    const lastAskedDate = localStorage.getItem('fapLastAskedDate');
    const lastAskedTimeTag = localStorage.getItem('fapLastAskedTimeTag');

    // Morning condition — first visit of the day
    if (lastAskedDate !== today && hour < 18) {
      setPopupTimeTag('morning');
      return true;
    }

    // After 6 PM
    if (hour >= 18 && hour < 22 && !(lastAskedDate === today && lastAskedTimeTag === 'evening')) {
      setPopupTimeTag('evening');
      return true;
    }

    // After 10 PM
    if (hour >= 22 && !(lastAskedDate === today && lastAskedTimeTag === 'night')) {
      setPopupTimeTag('night');
      return true;
    }

    return false;
  };

  const handleFapResponse = (didFap) => {
    const today = new Date().toDateString(); 
    if (didFap) {
      updateNFStreak(true);
    } else {
      localStorage.setItem('lastNFUpdateDate', today);
    }

    localStorage.setItem('fapLastAskedDate', today);
    localStorage.setItem('fapLastAskedTimeTag', popupTimeTag);
    setShowFapPopup(false);
  };

  const toggleChecklist = (itemKey) => {
    setChecklist(prevChecklist => {
      const currentItem = prevChecklist[itemKey];
      
      const newItem = [!currentItem[0], currentItem[1]];

      const newChecklist = {
        ...prevChecklist,
        [itemKey]: newItem
      };

      localStorage.setItem('dailyChecklist', JSON.stringify(newChecklist));

      return newChecklist;
    });
  };

  const checkDailyNFStreak = () => {
    if (!userId) return; 

    const today = new Date().toDateString();
    const lastUpdate = localStorage.getItem('lastNFUpdateDate');

    if (lastUpdate === today) {
      console.log("NF Streak already checked today.");
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();

    if (lastUpdate === yesterdayString) {
      console.log("Incrementing NF streak from yesterday.");
      updateNFStreak(false); 
    } else if (lastUpdate !== null) {
      console.log("Resetting NF streak due to missed day(s).");
      updateNFStreak(true);
    } else {
      console.log("Setting initial NF streak check date.");
      localStorage.setItem('lastNFUpdateDate', today);
    }
  };

  const checkDailyDTStreak = () => {
    if (!userId) return; 

    const today = new Date().toDateString();
    const lastUpdate = localStorage.getItem('lastDTUpdateDate');

    if (lastUpdate === today) {
      console.log("DT Streak already checked today.");
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayString = yesterday.toDateString();

    if (lastUpdate !== yesterdayString && lastUpdate !== null) {
      console.log("Resetting DT streak due to missed day.");
      updateDTStreak(true);
    }
 };

  const updateNFStreak = (reset = false) => {
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
    } catch (e) {
      console.error("Failed Updating No Fap Streak!", e);
    }
  };

  const updateDTStreak = (reset = false) => {
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

      localStorage.setItem('lastDTUpdateDate', new Date().toDateString());
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
          <p>&lt;Daily Question&gt;</p>
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