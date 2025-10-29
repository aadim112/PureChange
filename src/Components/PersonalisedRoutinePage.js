import React, { useState } from 'react';
import styles from './PersonalisedRoutinePage.module.css';
import Navbar from './Navbar';
import { ReactComponent as Goals } from "../assets/Goals.svg"
import { useNavigate } from 'react-router-dom';

export default function PersonalisedRoutinePage() {
  const [activeTab, setActiveTab] = useState('more-content');
  const navigate = useNavigate();

  return (
    <div className={styles["personalised-routine-page"]}>
      {/* Navbar */}
      <Navbar
        pageName="Personalised Routine"
        Icon={Goals}
        buttons={[
          { label: "Ranking", variant: "secondary", route: "/leaderboard" },
          { label: "My Routine", variant: "primary", route: "/routine" },
          { label: "Activity", variant: "secondary", route: "/activity" },
          { label: "My Page", variant: "secondary", route: "/mypage" },
        ]}
      />

      {/* Main Content */}
      <div className={styles["main-content"]}>
        <div className={styles["content-card"]}>
          <div className={styles["content-title"]}>Daily Routine</div>
          
          {/* Info Card */}
          <div className={styles["info-card"]}>
            <div className={styles["info-content"]}>
              <div className={styles["info-label"]}>&lt;Personalized  Weekly Schedule&gt;</div>
            </div>
          </div>
          <div className={styles["cards"]}>
            <div className={styles["info-card"]}>
                <div className={styles["info-content"]}>
                <div className={styles["info-label"]}>&lt;Motivation for following the schedule, Benefits and advantages of schedule&gt;</div>
                </div>
            </div>
            <div className={styles["info-card"]}>
                <div className={styles["info-content"]}>
                <div className={styles["info-label"]}>&lt;Suggestion for food .. weekly with measured protein intake&gt;</div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}