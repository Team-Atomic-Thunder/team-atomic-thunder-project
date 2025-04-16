import React from 'react';
import { Link } from 'react-router-dom';
import './Welcome.css';

const Welcome = () => {
  return (
    <div className="welcome-container">
      <div className="welcome-content">
        <h1>Welcome to Align</h1>
        <p className="subtitle">
          A website planner that gives students the chance to sync their tasks with their goals. 
          Upload your syllabus, and we'll extract all important dates and deadlines automatically.
        </p>
        <div className="auth-buttons">
          <Link to="/login" className="auth-button login-button">
            Login
          </Link>
          <Link to="/signup" className="auth-button signup-button">
            Sign Up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Welcome; 