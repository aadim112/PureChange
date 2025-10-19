import React, { useState } from 'react';
import styles from './ContentPage.module.css';
import Button from './Button';
import { ReactComponent as Flame } from "../assets/Flame.svg"
import { ReactComponent as Menu } from "../assets/Menu.svg"
import { useNavigate } from 'react-router-dom';

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState('content');
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={styles["content-page"]}>
      {/* Navbar */}
      <div className={styles["navbar"]}>
        <div className={styles["logo-section"]}>
          <Flame style={{width : 20 , height: 20}}></Flame>
          <p className={styles["page-name"]}>Activity</p>
        </div>

        {/* Hamburger button visible on small screens */}
        <div 
          className={styles["menu-icon"]} 
          onClick={() => setMenuOpen((prev) => !prev)}>
          <Menu style={{width : 20, height: 20 }} ></Menu>
        </div>

        {/* Navigation buttons (conditionally visible) */}
        <div 
          className={`${styles["navigation-buttons"]} 
          ${menuOpen ? styles["active"] : ""}`}>
          <Button 
            variant='secondary'
            onClick={() => navigate('/leaderboard')}
          >
            Ranking
          </Button>
          <Button 
            variant='secondary'
            onClick={() => navigate('/routine')}
          >
            My Routine
          </Button>
          <Button 
            variant='secondary'
            onClick={() => navigate('/activity')}
          >
            Activity
          </Button>
          <Button 
            variant='secondary'
            onClick={() => navigate('/mypage')}
          >
            My Page
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles["main-content"]}>
        {/* Question Card */}
        <div className={styles["question-card"]}>
          <div className={styles["question-title"]}>&lt;Daily Question&gt;</div>
          
          <div className={styles["scroll-container"]}>
            <div className={styles["scroll-paper"]}>
              <div className={styles["peacock-feather"]}></div>
              <div className={styles["ink-bottle"]}></div>
              <div className={styles["script-text"]}>&lt;Script&gt;</div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className={styles["info-card"]}>
          <div className={styles["info-content"]}>
            <div className={styles["info-label"]}>&lt;Translation&gt;</div>
            <div>&</div>
            <div className={styles["info-label"]}>&lt;Explanation&gt;</div>
          </div>
        </div>
      </div>

      {/* More Content Button */}
      <button className={styles["more-content-btn"]}>
        <span className={styles["btn-text-main"]}>More</span>
        <span className={styles["btn-text-sub"]}>Content</span>
      </button>
    </div>
  );
}