import React, { useState } from 'react';
import './ContentPage.css';
import { FileText } from 'lucide-react';

export default function ContentPage() {
  const [activeTab, setActiveTab] = useState('content');

  return (
    <div className="content-page">
      {/* Header */}
      <div className="header">
        <div className="header-left">
          <FileText size={24} />
          <span>Content</span>
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
        {/* Question Card */}
        <div className="question-card">
          <div className="question-title">&lt;Daily Question&gt;</div>
          
          <div className="scroll-container">
            <div className="scroll-paper">
              <div className="peacock-feather"></div>
              <div className="ink-bottle"></div>
              <div className="script-text">&lt;Script&gt;</div>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="info-card">
          <div className="info-content">
            <div className="info-label">&lt;Translation&gt;</div>
            <div>&</div>
            <div className="info-label">&lt;Explanation&gt;</div>
          </div>
        </div>
      </div>

      {/* More Content Button */}
      <button className="more-content-btn">
        <span className="btn-text-main">More</span>
        <span className="btn-text-sub">Content</span>
      </button>
    </div>
  );
}