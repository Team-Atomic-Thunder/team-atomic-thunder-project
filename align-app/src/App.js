import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendar, faTasks, faArrowUpFromBracket } from '@fortawesome/free-solid-svg-icons';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { app } from './firebase-config';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';

// Components
import HomePage from './HomePage';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import DashboardPage from './pages/Dashboard';
import SyllabusUpload from './components/syllabus/SyllabusUpload';
import CalendarPage from './pages/Calendar';
import DarkMode from './DarkMode';

// Navigation component
const Navigation = () => {
  const location = useLocation();
  const auth = getAuth(app);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, [auth]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  
  return (
    <Navbar expand="lg" className="custom-navbar">
      <Container>
        <Navbar.Brand as={Link} to="/" className="navbar-brand">
          <span className="brand-text">ALIGN</span>
        </Navbar.Brand>
        
        <DarkMode/>

        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            {currentUser ? (
              <>
                <Nav.Link as={Link} to="/dashboard" active={location.pathname === '/dashboard'}>
                  <FontAwesomeIcon icon={faTasks} className="me-2" />
                  Dashboard
                </Nav.Link>
                <Nav.Link as={Link} to="/upload" active={location.pathname === '/upload'}>
                  <FontAwesomeIcon icon={faArrowUpFromBracket} className="me-2" />
                  Upload
                </Nav.Link>
                <Nav.Link as={Link} to="/calendar" active={location.pathname === '/calendar'}>
                  <FontAwesomeIcon icon={faCalendar} className="me-2" />
                  Calendar
                </Nav.Link>
                <Button 
                  variant="outline-light" 
                  className="logout-button ms-2"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Nav.Link as={Link} to="/login" active={location.pathname === '/login'}>
                  Login
                </Nav.Link>
                <Nav.Link as={Link} to="/signup" active={location.pathname === '/signup'}>
                  Sign Up
                </Nav.Link>
              </>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth(app);

  useEffect(() => {
    // listen for auth state changes using Firebase mechanism
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [auth]);

  // protect routes
  const RequireAuth = ({ children }) => {
    if (loading) return <div>Loading...</div>;
    
    if (!currentUser) {
      return <Navigate to="/login" />;
    }
    
    return children;
  };

  return (
    <Router>
      <div className="d-flex flex-column min-vh-100">
        {/* Navigation */}
        <Navigation />

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
            <Route path="/calendar" element={
              <RequireAuth>
                <CalendarPage />
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
