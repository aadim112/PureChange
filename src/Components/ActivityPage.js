import React, { useState } from 'react';
import './ActivityPage.css';
import Button from './Button';
import { ReactComponent as Flame } from "../assets/Flame.svg"
import { ReactComponent as NoSign } from "../assets/NoSign.svg"
import { ReactComponent as Sun } from "../assets/Sun.svg"

export default function ActivityPage() {
  const [activeTab, setActiveTab] = useState('activity');
  const [checklist, setChecklist] = useState({
    drinkWater: false,
    yoga: false,
    readMinutes: false
  });

  const toggleChecklist = (item) => {
    setChecklist(prev => ({
      ...prev,
      [item]: !prev[item]
    }));
  };

  return (
    <div className="activity-page">
      <div className="navbar">
        <div className="logo-section">
          <Flame style={{width : 20 , height: 20}}></Flame>
          <p className="page-name">Activity</p>
        </div>
        <div className="navigation-buttons">
          <Button 
            variant='secondary'
            onClick={() => setActiveTab('ranking')}
          >
            Ranking
          </Button>
          <Button 
            variant='secondary'
            onClick={() => setActiveTab('routine')}
          >
            My Routine
          </Button>
          <Button 
            variant='primary'
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </Button>
          <Button 
            variant='secondary'
            onClick={() => setActiveTab('page')}
          >
            My Page
          </Button>
        </div>
      </div>

      <div className="body">
        {/* Daily Question */}
        <div className="daily-question-card">
          <p>&lt;Daily Question&gt;</p>
        </div>

        {/* Stats Section */}
        <div className="stats-section">
          {/* Tab Streak */}
          <div className="stat-card">
            <h3>Tab Streak</h3>
            <div className="streak-content">
              <div className="streak-item">
                <div className="streak-name">
                  <NoSign style={{width : 16 , height: 16}}></NoSign>
                  <p className="no-streak">No Fap Streak</p>
                </div>
                <div className="days">
                  <div className='day-name'>
                    <Flame style={{width : 18 , height: 18}}></Flame>
                    <span className="day-count">5 Days</span>
                  </div>
                  <div className="day-info">
                    <span className="small">Best: 11</span>
                    <span className="small">This month: 3</span>
                  </div>
                </div>
              </div>
              <div className="streak-item">
                <div className="streak-name">
                  <Sun style={{width : 16 , height: 16}}></Sun>
                  <p className='no-streak'>Daily Streak</p>
                </div>
                <div className="days">
                  <div className='day-name'>
                    <Flame style={{width : 18 , height: 18}}></Flame>
                    <span className="day-count">16 Days</span>
                  </div>
                  <div className="day-info">
                    <span className="small">Best: 14</span>
                    <span className="small">This month: 3</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="stat-card checklist">
            <h3>Checklist</h3>
            <div className="checklist-items">
              <label className="checkbox-item">
                <input 
                  type="checkbox" 
                  checked={checklist.drinkWater}
                  onChange={() => toggleChecklist('drinkWater')}
                />
                <span>Drink Water (2 liters)</span>
              </label>
              <label className="checkbox-item">
                <input 
                  type="checkbox"
                  checked={checklist.yoga}
                  onChange={() => toggleChecklist('yoga')}
                />
                <span>10 minutes Yoga</span>
              </label>
              <label className="checkbox-item">
                <input 
                  type="checkbox"
                  checked={checklist.readMinutes}
                  onChange={() => toggleChecklist('readMinutes')}
                />
                <span>Read 15 minutes</span>
              </label>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="content-section">
          <h2>Content</h2>
          <div className="content-grid">
            {/* General Content */}
            <div className="content-card">
              <div className="card-image general"></div>
              <h4>General Content</h4>
              <p>Articles, tips, lessons</p>
              <button className="explore-btn">Browse</button>
            </div>

            {/* Pro Content */}
            <div className="content-card">
              <div className="card-image pro"></div>
              <h4>Pro Content</h4>
              <p>Personalized routines, live videos</p>
              <button className="explore-btn">Explore</button>
            </div>

            {/* Elite Content */}
            <div className="content-card">
              <div className="card-image elite"></div>
              <h4>Elite Content</h4>
              <p>Personal calls, Creator videos</p>
              <button className="explore-btn">Explore</button>
            </div>

            {/* Daily Quote */}
            <div className="content-card">
              <div className="card-image quote"></div>
              <h4>Daily Quote</h4>
              <p>oh ! have a look</p>
              <button className="explore-btn">More Quotes</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}