import { useState } from 'react';
import styles from './GoalSetup.module.css';
import { ref, update } from 'firebase/database';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function GoalSetup() {
    const navigate = useNavigate();
    const [selectedOption, setSelectedOption] = useState('');

  const question = "What is your primary fitness goal?";
  const options = [
    "Quit Porn Completely",
    "Stop Masturbation Addiction",
    "Build a Long Streak (7–90 Days)",
    "Gain Strong Self-Control",
    "Improve Focus & Concentration",
    "Increase Energy Levels",
    "Reduce Brain Fog",
    "Gain Confidence & Self-Respect",
    "Build a Consistent Daily Routine",
    "Improve Physical Appearance",
    "Boost Motivation & Willpower",
    "Strengthen Relationships",
    "Better Sleep Quality",
    "Reduce Anxiety & Stress",
    "Spiritual Growth & Inner Peace",
    "Improve Productivity",
    "Break Social Media & Dopamine Addiction",
    "Become Physically Stronger",
    "Develop a Growth Mindset",
    "Become the Best Version of Themselves"
  ];


  const handleSubmit = () => {
    const userId = localStorage.getItem('userId');
    update(ref(db,`users/${userId}`),{
        Goal : selectedOption
    });
    navigate('/pricing');
  };

  return (
    <div className={styles["container"]}>
      <div className={styles["profilepanel"]}>
        <h1 className={styles["question"]}>
          {question}
        </h1>
        
        <div className={styles["options-container"]}>
          {options.map((option, index) => (
            <div
              key={index}
              onClick={() => setSelectedOption(option)}
              className={`${styles["option"]} ${
                selectedOption === option ? styles["option-selected"] : ''
              }`}
            >
              <p className={styles["option-text"]}>{option}</p>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!selectedOption}
          className={`${styles["submit-button"]} ${
            !selectedOption ? styles["submit-button-disabled"] : ''
          }`}
        >
          Submit
        </button>
      </div>
    </div>
  );
}