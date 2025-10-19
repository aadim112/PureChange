import React, { useState } from 'react';
import styles from './ContentPage.module.css';
import Navbar from './Navbar';
import Button from './Button';
import { ReactComponent as ContentIcon } from "../assets/Content.svg"
import { ReactComponent as ScriptureIcon } from "../assets/ScriptureIcon.svg"
import { useNavigate } from 'react-router-dom';

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState('content');
  const navigate = useNavigate();

  return (
    <div className={styles["content-page"]}>
      {/* Navbar */}
      <Navbar
        pageName="Content"
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
        {/* Question Card */}
        <div className={styles["question-card"]}>
          <div className={styles["question-title"]}>&lt;Daily Question&gt;</div>
          
          <div className={styles["scroll-container"]}>
            <ScriptureIcon className={styles["scroll-paper"]} />
            <div className={styles["script-text"]}>&lt;Script&gt;</div>
          </div>
          
          {/* Info Card */}
          <div className={styles["info-card"]}>
            <div className={styles["info-content"]}>
              <div className={styles["info-label"]}>&lt;Translation&gt;</div>
              <div>&</div>
              <div className={styles["info-label"]}>&lt;Explanation&gt;</div>
            </div>
          </div>
          
          {/* More Content Button */}
          <div className={styles["more-content-btn"]}>
            <Button
              onClick={() => navigate('/more-content')}
              variant="primary"
              className={styles["more-content"]}
            >
              More <br/>
              Content
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}