import React, { useState, useEffect } from 'react';
import styles from './ContentPage.module.css';
import Navbar from './Navbar';
import Button from './Button';
import { db } from "../firebase";
import { ref, get } from "firebase/database";
import { ReactComponent as ContentIcon } from "../assets/Content.svg"
import { ReactComponent as ScriptureIcon } from "../assets/ScriptureIcon.svg"
import { useNavigate } from 'react-router-dom';
import { getVersesByReligion } from '../services/contentService';

const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  // getMonth() is 0-indexed, so add 1
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

const shuffleArray = (array) => {
  let currentIndex = array.length,  randomIndex;
  const newArray = [...array];

  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    [newArray[currentIndex], newArray[randomIndex]] = [
      newArray[randomIndex], newArray[currentIndex]];
  }
  return newArray;
};

const formatVerse = (content, religion) => {
  let formattedContent = content;

  if (typeof formattedContent !== 'string') {
    formattedContent = String(formattedContent || '');
  }

  formattedContent = formattedContent.replace(/\n\s*(\|\||\||: |۝|\.|!|\?|。|？|！)/g, '$1');
  
  switch (religion.toLowerCase()) {
    case 'hinduism':
    case 'buddhism':
    case 'jainism':
    case 'sikhism':
      formattedContent = formattedContent.replace(/(\|\||\|)/g, '$1\n');
      break;

    case 'judaism':
      formattedContent = formattedContent.replace(/:/g, '$1\n');
      break;

    case 'islam':
      formattedContent = formattedContent.replace(/(۝)/g, '$1\n');
      break;

    case 'christianity':
    case 'baha’i faith':
      formattedContent = formattedContent.replace(/(\.|!|\?)(?!\s*\w)/g, '$1\n');
      break;

    case 'taoism':
    case 'confucianism':
    case 'shinto':
    case 'zen (chan buddhism)':
      formattedContent = formattedContent.replace(/(。|？|！)/g, '$1\n');
      break;

    case 'zoroastrianism':
      formattedContent = formattedContent.replace(/(\.)/g, '$1\n');
      break;

    default:
      formattedContent = formattedContent.replace(/\\n/g, '\n');
      break;
  }
  console.log(formattedContent.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0))

  return formattedContent.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
};

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState('content');
  const navigate = useNavigate();
  const [religion, setReligion] = useState(null);
  const [script, setScript] = useState(<p>{'<script>'}</p>);
  const [translation_EN, setTranslation_EN] = useState('<Transtion English>');
  const [translation_HI, setTranslation_HI] = useState('<Transtion Hindi>');
  const [explanation, setExplaition] = useState('<Explaination>');
  const [question, setQuestion] = useState('<Question>');

  useEffect(() => {  
    fetchUserReligion();
  }, []);

  useEffect(() => {
    if (religion) {
      console.log("Religion: ",religion);
      updateContent(religion);
    }
  }, [religion]);
  
  const fetchUserReligion = async () => {
    try {
      const userId = localStorage.getItem('userId');
      console.log("User from ContentPage",userId);
      if (!userId) {
        navigate('/');
        return;
      }

      const userRef = ref(db, `users/${userId}`);
      const snapshot = await get(userRef);

      if (snapshot.exists()) {
        const data = snapshot.val();
        setReligion(data.Religion || '');
      }
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
  };

  const updateContent = async (religion) => {
    try {
      const verses = await getVersesByReligion(religion);
      if (!verses) {
        console.log("No verses found for this religion.");
        return;
      }

      const allVerseKeys = Object.keys(verses);
      if (allVerseKeys.length === 0) {
        console.log("Verse object is empty.");
        return;
      }

      const todayStr = getLocalDate();
      const lastDate = localStorage.getItem('lastVerseDate');
      
      let shuffledKeys = JSON.parse(localStorage.getItem('shuffledVerseKeys'));
      let currentIndex = parseInt(localStorage.getItem('currentVerseIndex'), 10);

      const keysMatch = shuffledKeys && allVerseKeys.length === shuffledKeys.length && allVerseKeys.every(key => shuffledKeys.includes(key));

      if (lastDate === todayStr && keysMatch && !isNaN(currentIndex)) {
        console.log("Same day, using stored verse.");
      } else {
        console.log("New day, fetching new verse.");

        if (!keysMatch || isNaN(currentIndex) || currentIndex >= allVerseKeys.length - 1) {
          console.log("Shuffling new list.");
          shuffledKeys = shuffleArray(allVerseKeys);
          currentIndex = 0;
        } else {
          console.log("Incrementing verse index.");
          currentIndex++;
        }
        
        localStorage.setItem('lastVerseDate', todayStr);
        localStorage.setItem('shuffledVerseKeys', JSON.stringify(shuffledKeys));
        localStorage.setItem('currentVerseIndex', currentIndex.toString());
      }

      const todayVerseKey = shuffledKeys[currentIndex];
      const todayVerse = verses[todayVerseKey];

      if (todayVerse) {
        const lines = formatVerse(todayVerse.actual_content || '<Scripture>', religion);
        const scriptElements = lines.map((line, index) => (
          <p key={index} className={styles["verse-line"]}>
            {line}
          </p>
        ));
        setScript(scriptElements);
        
        setTranslation_EN(todayVerse.eng_translation || '<English Translation>');
        setTranslation_HI(todayVerse.hi_translation || '<Hindi Translation>');
        setExplaition(todayVerse.explanation || '<Explanation>');
        setQuestion(todayVerse.question ||'<Verse of the Day>');
      } else {
        console.error("Could not find verse for key:", todayVerseKey);
      }

    } catch (error) {
      console.error("Error in updateContent:", error);
    }
  };

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
          <div className={styles["question-title"]}>{question}</div>
          
          <div className={styles["scroll-container"]}>
            <ScriptureIcon className={styles["scroll-paper"]} />
            <div className={styles["script-text"]}>{script}</div>
          </div>
          
          {/* Info Card */}
          <div className={styles["info-card"]}>
            <div className={styles["info-content"]}>
              <div className={styles["info-label"]}>{translation_EN}</div>
              <div className={styles["info-label"]}>{translation_HI}</div>
              <div className={styles["info-label"]}>{explanation}</div>
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