import React from 'react';
import styles from './UpgradePlanPopup.module.css';
import { useNavigate } from 'react-router-dom';

const UpgradePopup = ({ show, onClose, requiredPlan }) => {
  const navigate = useNavigate();

  if (!show) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <div className={styles.iconWrapper}>
          <span className={styles.icon}>🔒</span>
        </div>
        <h2 className={styles.title}>Content Locked</h2>
        <p className={styles.message}>
          This content is exclusive to the <strong>{requiredPlan}</strong> plan.
          Upgrade your plan to unlock this content and accelerate your progress.
        </p>
        <div className={styles.buttonGroup}>
          <button 
            className={styles.upgradeBtn}
            onClick={() => navigate('/pricing')}
          >
            Upgrade Now
          </button>
          <button 
            className={styles.cancelBtn}
            onClick={onClose}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradePopup;