import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faCalendar, faTasks, faUsers, faCog } from '@fortawesome/free-solid-svg-icons';
import './App.css';

// Navigation component
const Navigation = () => {
  const location = useLocation();

  return (
    <nav className="navbar navbar-expand-lg">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">
          <span>Align</span>
        </Link>
        
        <button 
          className="navbar-toggler" 
          type="button" 
          data-bs-toggle="collapse" 
          data-bs-target="#navbarNav" 
          aria-controls="navbarNav" 
          aria-expanded="false" 
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link 
                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} 
                to="/"
              >
                <FontAwesomeIcon icon={faHome} className="me-2" />
                Home
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                className={`nav-link ${location.pathname === '/calendar' ? 'active' : ''}`} 
                to="/calendar"
              >
                <FontAwesomeIcon icon={faCalendar} className="me-2" />
                Calendar
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                className={`nav-link ${location.pathname === '/tasks' ? 'active' : ''}`} 
                to="/tasks"
              >
                <FontAwesomeIcon icon={faTasks} className="me-2" />
                Tasks
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                className={`nav-link ${location.pathname === '/team' ? 'active' : ''}`} 
                to="/team"
              >
                <FontAwesomeIcon icon={faUsers} className="me-2" />
                Team
              </Link>
            </li>
            <li className="nav-item">
              <Link 
                className={`nav-link ${location.pathname === '/settings' ? 'active' : ''}`} 
                to="/settings"
              >
                <FontAwesomeIcon icon={faCog} className="me-2" />
                Settings
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

// Main App component
function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <main className="container py-4">
          <Routes>
            <Route path="/" element={<div>Home Page</div>} />
            <Route path="/calendar" element={<div>Calendar Page</div>} />
            <Route path="/tasks" element={<div>Tasks Page</div>} />
            <Route path="/team" element={<div>Team Page</div>} />
            <Route path="/settings" element={<div>Settings Page</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App; 