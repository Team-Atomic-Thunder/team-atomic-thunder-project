import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase'; // Assuming firebase.js is in src folder

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Reset error
    setError('');
    
    // Basic validation
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return;
    }
    
    setLoading(true);
    
    try {
      // Sign in with Firebase directly
      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      
      // Redirect to dashboard on successful login
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        setError('Invalid email or password. Please try again.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many unsuccessful login attempts. Please try again later.');
      } else {
        setError('Failed to log in. Please check your credentials and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <h2 className="text-center mb-4">Log In</h2>
              
              {error && (
                <Alert variant="danger" className="mb-4">
                  {error}
                </Alert>
              )}
              
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
                
                <Form.Group className="mb-4">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <div className="d-flex justify-content-end mt-1">
                    <Link to="/forgot-password" className="text-decoration-none small">
                      Forgot Password?
                    </Link>
                  </div>
                </Form.Group>
                
                <div className="d-grid mb-3">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? 'Logging In...' : 'Log In'}
                  </Button>
                </div>
                
                <p className="text-center mb-0">
                  Don't have an account? <Link to="/signup">Sign up</Link>
                </p>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default Login;