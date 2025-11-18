import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, update } from 'firebase/database';
import { db } from '../firebase';
import styles from './Questions.module.css';
import Button from './Button';
import clsx from 'clsx';
import { ProcessHealth } from '../services/llmService';

const QUESTIONS = [
  {
    id: 1,
    question: "What made you join this platform today?",
    options: [
      "Quit masturbation",
      "Reduce frequency",
      "Improve focus",
      "Improve confidence",
      "Improve energy/health"
    ]
  },
  {
    id: 2,
    question: "How long have you been struggling with this habit?",
    options: [
      "Just started",
      "3-12 months",
      "1-3 years",
      "More than 3 years",
    ]
  },
  {
    id: 3,
    question: "3. What triggers you the most?",
    options: [
      "Boredom",
      "Stress",
      "Loneliness",
      "Late-night phone usage",
      "Instagram/Reels",
      "No routine / too much free time"
    ]
  },
  {
    id: 4,
    question: "4. When do you experience the strongest urges?",
    options: [
      "Early morning",
      "Afternoon",
      "Night",
      "Late night",
    ]
  },
  {
    id: 5,
    question: "5. How many hours do you sleep daily?",
    options: [
      "Less than 6 hours",
      "6-7 hours",
      "7-8 hours",
      "More than 8 hours",
    ]
  },
  {
    id: 6,
    question : "6. How often do you exercise?",
    options: [
      "Daily",
      "3-5 days/week",
      "1-2 days/week",
      "I don't exercise"
    ]
  },
  {
    id: 7,
    question: "7. How would you rate your current lifestyle?",
    options: [
      "Healthy",
      "Average",
      "Poor / No discipline"
    ]
  },
  {
    id: 8,
    question: "8. How serious are you about fixing this habit? (1-10)",
    options: [
      "1-3",
      "4-6",
      "7-8",
      "9-10"
    ]
  },
  {
    id: 9,
    question: "9. What type of support do you want from this platform?",
    options: [
      "Daily motivation",
      "Science-based guidance",
      "Routine + daily tasks",
      "Community support",
      "All of the above"
    ]
  },
  {
    id: 10,
    question: "10. Do you want exclusive Food & Lifestyle Tips that reduce urges naturally?",
    options: [
      "Yes, definitely",
      "Not right now",
      "Maybe later"
    ]
  }
];

const Question = () => {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedOption, setSelectedOption] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === QUESTIONS.length - 1;

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };

  const handleClear = () => {
    setSelectedOption('');
  };

  const handleNext = async () => {
    if (!selectedOption) return;
    const userId = localStorage.getItem('userId');

    // Save current answer
    const updatedAnswers = {
      ...answers,
      [`question${currentQuestion.id}`]: selectedOption
    };
    setAnswers(updatedAnswers);

    if (isLastQuestion) {
      // Save to Firebase
      await saveToFirebase(updatedAnswers);

      const formattedData = QUESTIONS.map((q) => ({
        question: q.question,
        answer: updatedAnswers[`question${q.id}`],
      }));
      const score = await ProcessHealth(formattedData);
      const userRef = ref(db, `users/${userId}`);
      console.log(score);
      await update(userRef, { HealthScore: score });
    } else {
      // Move to next question
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setSelectedOption('');
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      // Load previous answer if exists
      const previousAnswer = answers[`question${QUESTIONS[currentQuestionIndex - 1].id}`];
      setSelectedOption(previousAnswer || '');
    }
  };

  const saveToFirebase = async (finalAnswers) => {
    setIsSaving(true);
    try {
      const userId = localStorage.getItem('userId');
      
      if (!userId) {
        throw new Error('User ID not found. Please log in again.');
      }

      // TODO: Implement your Firebase save logic here
      // Example structure:
      const questionnaireData = {
        ...finalAnswers,
        completedAt: new Date().toISOString()
      };

      const userRef = ref(db, `users/${userId}/questionnaire`);
      await update(userRef, questionnaireData);

      console.log('Questionnaire saved successfully');
      localStorage.setItem('questionnaireCompleted', 'true');
      
      alert('Questionnaire complete!');
      navigate('/goal-question', { replace: true });
    } catch (error) {
      console.error('Error saving questionnaire:', error);
      alert(`Error saving questionnaire: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles["question"]}>
      <form className={styles["question-form"]} onSubmit={(e) => e.preventDefault()}>
        <h2>Hello,{localStorage.getItem('UserName')}!</h2>
        <br></br>
        <div className={styles["progress-indicator"]}>
          <p className={styles["progress-text"]}>
            Question {currentQuestionIndex + 1} of {QUESTIONS.length}
          </p>
          <div className={styles["progress-bar"]}>
            <div 
              className={styles["progress-fill"]} 
              style={{ width: `${((currentQuestionIndex + 1) / QUESTIONS.length) * 100}%` }}
            />
          </div>
        </div>

        <p className={styles["question-label"]}>{currentQuestion.question}</p>

        <div className={styles["optionsContainer"]}>
          {currentQuestion.options.map((option, index) => (
            <div
              key={index}
              className={clsx(
                styles['option-card'],
                selectedOption === option && styles.selected
              )}

              onClick={() => handleOptionSelect(option)}
            >
              <span className={styles["option-text"]}>{option}</span>
            </div>
          ))}
        </div>

        <div className={styles["action-buttons"]}>
          {currentQuestionIndex > 0 && (
            <Button
              onClick={handleBack}
              className={styles["btn-back"]}
              disabled={isSaving}
            >
              Back
            </Button>
          )}
          <Button
            variant='secondary'
            onClick={handleClear}
            disabled={isSaving}
          >
            Clear
          </Button>
          <Button
            variant='primary'
            onClick={handleNext}
            className={styles["btn-next"]}
            disabled={!selectedOption || isSaving}
          >
            {isSaving ? 'Saving...' : isLastQuestion ? 'Submit' : 'Next'}
          </Button>
        </div>
        <br></br>
      </form>
    </div>
  );
};

export default Question;