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
    question: "How often do you feel the urge to masturbate?",
    options: [
      "Multiple times a day",
      "Once a day",
      "Few times a week",
      "Once a week",
      "Rarely"
    ]
  },
  {
    id: 2,
    question: "How long have you been trying to quit or reduce this habit?",
    options: [
      "Just started",
      "Less than a month",
      "1-3 months",
      "3-6 months",
      "More than 6 months"
    ]
  },
  {
    id: 3,
    question: "What triggers your urge the most?",
    options: [
      "Stress or anxiety",
      "Boredom",
      "Social media/Internet",
      "Being alone",
      "Other"
    ]
  },
  {
    id: 4,
    question: "What is your primary motivation for change?",
    options: [
      "Improve mental health",
      "Better relationships",
      "Religious/Spiritual reasons",
      "Increase productivity",
      "Build self-discipline",
      "Improve mental health",
      "Better relationships",
      "Religious/Spiritual reasons",
      "Increase productivity",
      "Build self-discipline"
    ]
  },
  {
    id: 5,
    question: "How would you rate your current self-control?",
    options: [
      "Very low",
      "Low",
      "Moderate",
      "Good",
      "Excellent"
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
      navigate('/edit-profile', { replace: true });
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