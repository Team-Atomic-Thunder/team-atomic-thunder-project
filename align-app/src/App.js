import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
<<<<<<< HEAD
=======

// Components
>>>>>>> signup
import HomePage from './HomePage';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import DashboardPage from './pages/Dashboard';
import SyllabusUpload from './components/syllabus/SyllabusUpload';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem('alignCurrentUser');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
    setLoading(false);
  }, []);

  // A simple function to protect routes
  const RequireAuth = ({ children }) => {
    if (loading) return <div>Loading...</div>;
    
    if (!currentUser) {
      return <Navigate to="/login" />;
    }
    
    return children;
  };

  const handleLogout = () => {
    localStorage.removeItem('alignCurrentUser');
    setCurrentUser(null);
    window.location.href = '/';
  };

  return (
    <Router>
      <div className="d-flex flex-column min-vh-100">
        {/* Header with Navigation */}
        <header className="bg-dark text-white p-3">
          <div className="container d-flex justify-content-between align-items-center">
            <h1 className="h4 mb-0">Align</h1>
            
            <nav>
              <ul className="list-unstyled d-flex mb-0">
                {currentUser ? (
                  <>
                    <li className="me-3">
                      <Link to="/dashboard" className="text-white text-decoration-none">Dashboard</Link>
                    </li>
                    <li className="me-3">
                      <Link to="/upload" className="text-white text-decoration-none">Upload</Link>
                    </li>
                    <li>
                      <button 
                        onClick={handleLogout}
                        className="btn btn-link text-white text-decoration-none p-0"
                      >
                        Logout
                      </button>
                    </li>
                  </>
                ) : (
                  <>
                    <li className="me-3">
                      <Link to="/login" className="text-white text-decoration-none">Login</Link>
                    </li>
                    <li>
                      <Link to="/signup" className="text-white text-decoration-none">Sign Up</Link>
                    </li>
                  </>
                )}
              </ul>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow-1">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage currentUser={currentUser} />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            } />
            <Route path="/upload" element={
              <RequireAuth>
                <SyllabusUpload />
              </RequireAuth>
            } />
            
            {/* Fallback Route */}
            <Route path="*" element={<HomePage currentUser={currentUser} />} />
          </Routes>
        </main>

        {/* Simple Footer */}
        <footer className="bg-light py-3 mt-auto">
          <div className="container text-center">
            <p className="text-muted mb-0">
              &copy; {new Date().getFullYear()} Align - Team Atomic Thunder
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;