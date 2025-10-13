import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, update } from 'firebase/database';
import { db } from '../firebase';
import './Questions.css';

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

    // Save current answer
    const updatedAnswers = {
      ...answers,
      [`question${currentQuestion.id}`]: selectedOption
    };
    setAnswers(updatedAnswers);

    if (isLastQuestion) {
      // Save to Firebase
      await saveToFirebase(updatedAnswers);
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
      navigate('/home', { replace: true });
    } catch (error) {
      console.error('Error saving questionnaire:', error);
      alert(`Error saving questionnaire: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="question">
      <form className="question-form" onSubmit={(e) => e.preventDefault()}>
        <h2>Hello,{localStorage.getItem('UserName')}!</h2>
        <br></br>
        <div className="progress-indicator">
          <p className="progress-text">
            Question {currentQuestionIndex + 1} of {QUESTIONS.length}
          </p>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${((currentQuestionIndex + 1) / QUESTIONS.length) * 100}%` }}
            />
          </div>
        </div>

        <p className="question-label">{currentQuestion.question}</p>

        <div className="optionsContainer">
          {currentQuestion.options.map((option, index) => (
            <div
              key={index}
              className={`option-card ${selectedOption === option ? 'selected' : ''}`}
              onClick={() => handleOptionSelect(option)}
            >
              <span className="option-text">{option}</span>
            </div>
          ))}
        </div>

        <div className="action-buttons">
          {currentQuestionIndex > 0 && (
            <button
              type="button"
              onClick={handleBack}
              className="btn-back"
              disabled={isSaving}
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="btn-clear"
            disabled={isSaving}
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="btn-next"
            disabled={!selectedOption || isSaving}
          >
            {isSaving ? 'Saving...' : isLastQuestion ? 'Submit' : 'Next'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Question;