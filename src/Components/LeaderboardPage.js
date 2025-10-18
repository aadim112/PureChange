import React, { useState } from 'react';
import './LeaderboardPage.css';
import { Trophy, Award, Medal } from 'lucide-react';

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState('ranking');

  // Sample leaderboard data
  const leaderboardData = [
    { rank: 1, name: 'Rohan Sali', badge: 'RS', level: 'M+3', score: '671-11', streak: '28s', highlight: true },
    { rank: 2, name: 'User 2', badge: 'U2', level: 'M+2', score: '550-10', streak: '25s' },
    { rank: 3, name: 'User 3', badge: 'U3', level: 'M+1', score: '480-9', streak: '20s' },
    { rank: 4, name: 'User 4', badge: 'U4', level: 'M', score: '420-8', streak: '18s' },
    { rank: 5, name: 'User 5', badge: 'U5', level: 'M', score: '390-7', streak: '15s' },
    { rank: 6, name: 'User 6', badge: 'U6', level: 'B+2', score: '350-6', streak: '12s' },
    { rank: 7, name: 'User 7', badge: 'U7', level: 'B+1', score: '320-5', streak: '10s' },
    { rank: 8, name: 'User 8', badge: 'U8', level: 'B', score: '280-4', streak: '8s' },
  ];

  return (
    <div className="leaderboard-page">
      {/* Header */}
      <div className="header">
        <div className="header-left">
          <Trophy size={24} />
          <span>Rankings</span>
        </div>
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'ranking' ? 'active' : ''}`}
            onClick={() => setActiveTab('ranking')}
          >
            Ranking
          </button>
          <button 
            className={`tab ${activeTab === 'routine' ? 'active' : ''}`}
            onClick={() => setActiveTab('routine')}
          >
            My Routine
          </button>
          <button 
            className={`tab ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
          <button 
            className={`tab ${activeTab === 'page' ? 'active' : ''}`}
            onClick={() => setActiveTab('page')}
          >
            My Page
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* User Stats Card */}
        <div className="user-stats-card">
          <div className="user-avatar">
            <div className="avatar-circle">RS</div>
            <div className="user-name">Rohan Sali</div>
          </div>

          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Current Month</div>
              <div className="stat-value">No Fap : 0 Days</div>
              <div className="stat-subvalue">Daily Task : 0/8 Days</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Best</div>
              <div className="stat-value">No Fap : 0 Days</div>
              <div className="stat-subvalue">Daily Task : 0/8 Days</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Rank</div>
              <div className="stat-value">1st in Gold</div>
              <div className="stat-subvalue rank-global">200 Global</div>
            </div>
          </div>
        </div>

        {/* Leaderboard Section */}
        <div className="leaderboard-card">
          <div className="leaderboard-header">
            <h2>Leaderboard</h2>
            <div className="tier-badge">
              <Award className="tier-icon" size={20} />
              <span>Gold</span>
            </div>
          </div>

          <div className="leaderboard-list">
            {/* Top 3 with special styling */}
            {leaderboardData.slice(0, 3).map((user) => (
              <div 
                key={user.rank} 
                className={`leaderboard-item ${user.highlight ? 'highlight' : ''} rank-${user.rank}`}
              >
                <div className="rank-section">
                  <div className="rank-number">
                    {user.rank === 1 && '1st'}
                    {user.rank === 2 && '2nd'}
                    {user.rank === 3 && '3rd'}
                  </div>
                </div>
                <div className="user-section">
                  <div className="user-badge">{user.badge}</div>
                  <span className="user-name-text">{user.name}</span>
                </div>
                <div className="stats-section">
                  <span className="level-badge">{user.level}</span>
                  <span className="score">{user.score}</span>
                  <span className="streak">{user.streak}</span>
                </div>
              </div>
            ))}

            {/* Rest of the rankings */}
            {leaderboardData.slice(3).map((user) => (
              <div key={user.rank} className="leaderboard-item">
                <div className="rank-section">
                  <div className="rank-number-plain">{user.rank}</div>
                </div>
                <div className="user-section">
                  <div className="user-badge small">{user.badge}</div>
                  <span className="user-name-text">{user.name}</span>
                </div>
                <div className="stats-section">
                  <span className="level-badge small">{user.level}</span>
                  <span className="score small">{user.score}</span>
                  <span className="streak small">{user.streak}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}