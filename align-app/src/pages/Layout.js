import React from 'react';
import { Container, Navbar, Nav } from 'react-bootstrap';
import { Link, NavLink } from 'react-router-dom';

const Layout = ({ children }) => {
  return (
    <div className="d-flex flex-column min-vh-100">
      <Navbar bg="dark" variant="dark" expand="lg" className="mb-4">
        <Container>
          <Navbar.Brand as={Link} to="/">Align</Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="ms-auto">
              <Nav.Link as={NavLink} to="/" end>Home</Nav.Link>
              <Nav.Link as={NavLink} to="/upload">Upload</Nav.Link>
              <Nav.Link as={NavLink} to="/dashboard">Dashboard</Nav.Link>
              <Nav.Link as={NavLink} to="/calendar">Calendar</Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <main className="flex-grow-1">
        {children}
      </main>

      <footer className="bg-light py-4 mt-5">
        <Container className="text-center">
          <p className="text-muted mb-0">
            &copy; {new Date().getFullYear()} Align - Team Atomic Thunder
          </p>
        </Container>
      </footer>
    </div>
  );
};

export default Layout;