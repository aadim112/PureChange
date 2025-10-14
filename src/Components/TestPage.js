import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Button from './Button';

// TestPage Component - Ready to integrate with React Router

function TestPage() {
  const navigate = useNavigate();

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
    </>
  );
}

export default TestPage;