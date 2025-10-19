import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Button from './Button';
import Navbar from './Navbar';
import { ReactComponent as Flame } from "../assets/Flame.svg"

// TestPage Component - Ready to integrate with React Router

function TestPage() {
  const [activeTab, setActiveTab] = useState('testpage');
  const navigate = useNavigate();

  const buttons = [
    { label: "Ranking", variant: "secondary", route: "/leaderboard" },
    { label: "My Routine", variant: "secondary", route: "/routine" },
    { label: "Activity", variant: "primary", route: "/activity" },
    { label: "My Page", variant: "secondary", route: "/mypage" },
  ];

  return (
    <>
    <div style={{margin: "100px"}}>
      {/* Renders the primary button */}
      <Button variant="primary" onClick={() => alert('Submitted!')}>
        Submit
      </Button>

      {/* Renders the secondary button */}
      <Button variant="secondary" onClick={() => alert('Cancelled!')}>
        Cancel
      </Button>

      {/* Renders the destructive button */}
      <Button variant="common" onClick={() => alert('Deleted!')}>
        Delete Account
      </Button>

      {/* Renders the text button */}
      <Button variant="common-black" onClick={() => alert('Learned more!')}>
        Learn More
      </Button>
    </div>
    <div>
      <Navbar pageName="Activity" Icon={Flame} buttons={buttons} />
      <Navbar />
    </div>
    </>
  );
}

export default TestPage;