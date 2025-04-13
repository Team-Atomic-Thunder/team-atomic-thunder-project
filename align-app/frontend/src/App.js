import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { Container, Navbar, Nav, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// Components
import HomePage from './HomePage';
import SignUp from './pages/SignUp';
import Login from './pages/Login';
import DashboardPage from './pages/Dashboard';
import SyllabusUpload from './components/syllabus/SyllabusUpload';
import CalendarPage from './pages/Calendar';
import ViewSyllabus from './components/syllabus/ViewSyllabus';
import { AuthProvider } from './context/AuthContext';

// Navigation bar component that shows different links based on login status
const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check if we have a token in localStorage when location changes
  // This way we update the nav when the user logs in/out
  useEffect(() => {
    const token = localStorage.getItem('token');
    // Convert to boolean with !!
    setIsAuthenticated(!!token);
    
    // Could add a token validation step here later
  }, [location]);

  // Log out the user by removing their token
  const handleLogout = () => {
    // Remove the auth token
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    // Update auth state
    setIsAuthenticated(false);
    
    // Send them back to login page
    navigate('/login');
  };

  // I'm using a mix of styled links with conditional classes for active states
  return (
    <Navbar expand="lg" className="custom-navbar">
      <Container>
        {/* Logo/Brand link */}
        <Navbar.Brand as={Link} to="/" className="navbar-brand">
          <span className="brand-text">ALIGN</span>
        </Navbar.Brand>
        
        {/* Hamburger menu for mobile */}
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        
        {/* Nav links */}
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="ms-auto">
            {/* Show these links only if logged in */}
            {isAuthenticated ? (
              <>
                <Nav.Link 
                  as={Link} 
                  to="/dashboard" 
                  className={`nav-link ${location.pathname === '/dashboard' ? 'active' : ''}`}
                >
                  Dashboard
                </Nav.Link>
                <Nav.Link 
                  as={Link} 
                  to="/upload" 
                  className={`nav-link ${location.pathname === '/upload' ? 'active' : ''}`}
                >
                  Upload
                </Nav.Link>
                <Nav.Link 
                  as={Link} 
                  to="/view" 
                  className={`nav-link ${location.pathname === '/view' ? 'active' : ''}`}
                >
                  View Files
                </Nav.Link>
                <Nav.Link 
                  as={Link} 
                  to="/calendar" 
                  className={`nav-link ${location.pathname === '/calendar' ? 'active' : ''}`}
                >
                  Calendar
                </Nav.Link>
                
                {/* Logout button */}
                <Button 
                  variant="outline-light" 
                  className="ms-2 logout-button"
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </>
            ) : (
              // Show these links if not logged in
              <>
                <Nav.Link 
                  as={Link} 
                  to="/login" 
                  className={`nav-link ${location.pathname === '/login' ? 'active' : ''}`}
                >
                  Login
                </Nav.Link>
                <Nav.Link 
                  as={Link} 
                  to="/signup" 
                  className={`nav-link ${location.pathname === '/signup' ? 'active' : ''}`}
                >
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
  return (
    <AuthProvider>
      <Router>
        <Navigation />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/upload" element={<SyllabusUpload />} />
          <Route path="/view" element={<ViewSyllabus />} />
          <Route path="/calendar" element={<CalendarPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;