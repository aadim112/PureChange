import React, { useState } from 'react';
import styles from './MoreContentPage.module.css';
import Navbar from './Navbar';
import { ReactComponent as ContentIcon } from "../assets/Content.svg"
import { useNavigate } from 'react-router-dom';

export default function MoreContentPage() {
  const [activeTab, setActiveTab] = useState('more-content');
  const navigate = useNavigate();

  return (
    <div className={styles["more-content-page"]}>
      {/* Navbar */}
      <Navbar
        pageName="More Content"
        Icon={ContentIcon}
        buttons={[
          { label: "Ranking", variant: "secondary", route: "/leaderboard" },
          { label: "My Routine", variant: "secondary", route: "/routine" },
          { label: "Activity", variant: "secondary", route: "/activity" },
          { label: "My Page", variant: "secondary", route: "/mypage" },
        ]}
      />

      {/* Main Content */}
      <div className={styles["main-content"]}>
        <div className={styles["content-card"]}>
          <div className={styles["content-title"]}>Motivation</div>
          
          {/* Info Card */}
          <div className={styles["info-card"]}>
            <div className={styles["info-content"]}>
              <div className={styles["info-label"]}>&lt;Videos&gt;</div>
            </div>
          </div>
          <div className={styles["cards"]}>
            <div className={styles["info-card"]}>
                <div className={styles["info-content"]}>
                <div className={styles["info-label"]}>&lt;Quotes&gt;</div>
                </div>
            </div>
            <div className={styles["info-card"]}>
                <div className={styles["info-content"]}>
                <div className={styles["info-label"]}>&lt;Images&gt;</div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}