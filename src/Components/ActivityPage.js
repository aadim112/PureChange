import React, { useState } from 'react';
import styles from './ActivityPage.module.css';
import Navbar from './Navbar';
import { ReactComponent as Flame } from "../assets/Flame.svg"
import { ReactComponent as NoSign } from "../assets/NoSign.svg"
import { ReactComponent as Sun } from "../assets/Sun.svg"
import { useNavigate } from 'react-router-dom';

export default function ActivityPage() {
  const [activeTab, setActiveTab] = useState('activity');
  const navigate = useNavigate();

  const [checklist, setChecklist] = useState({
    drinkWater: false,
    yoga: false,
    readMinutes: false
  });

  const toggleChecklist = (item) => {
    setChecklist(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
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
        <div className={styles["daily-question-card"]}>
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
                    <span className={styles["day-count"]}>5 Days</span>
                  </div>
                  <div className={styles["day-info"]}>
                    <span className={styles["small"]}>Best: 11</span>
                    <span className={styles["small"]}>This month: 3</span>
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
                    <span className={styles["day-count"]}>16 Days</span>
                  </div>
                  <div className={styles["day-info"]}>
                    <span className={styles["small"]}>Best: 14</span>
                    <span className={styles["small"]}>This month: 3</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className={styles["stat-card"]}>
            <h3>Checklist</h3>
            <div className={styles["checklist-items"]}>
              <label className={styles["checkbox-item"]}>
                <input 
                  type="checkbox" 
                  checked={checklist.drinkWater}
                  onChange={() => toggleChecklist('drinkWater')}
                />
                <span>Drink Water (2 liters)</span>
              </label>
              <label className={styles["checkbox-item"]}>
                <input 
                  type="checkbox"
                  checked={checklist.yoga}
                  onChange={() => toggleChecklist('yoga')}
                />
                <span>10 minutes Yoga</span>
              </label>
              <label className={styles["checkbox-item"]}>
                <input 
                  type="checkbox"
                  checked={checklist.readMinutes}
                  onChange={() => toggleChecklist('readMinutes')}
                />
                <span>Read 15 minutes</span>
              </label>
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
    </div>
  );
}