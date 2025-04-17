import React, { useState, useEffect } from 'react';
import { Navbar, Nav, Container, Button } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { app } from '../../firebase-config';
import './Navigation.css';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const auth = getAuth(app);

  // Check Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, [auth]);

  // Log out the user using Firebase
  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

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

export default Navigation; 