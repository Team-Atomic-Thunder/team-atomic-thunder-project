import React, { useState } from 'react';
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { app } from './../firebase-config';

function SignUp() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  
  // Initialize Firebase auth and firestore
  const auth = getAuth(app);
  const db = getFirestore(app);

  console.log("Firebase auth initialized:", !!auth);
  console.log("Firestore initialized:", !!db);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const validateForm = () => {
    // reset error
    setError('');

    // verify fields are filled out
    const { email, password, confirmPassword, firstName, lastName } = formData;
    if (!email || !password || !confirmPassword || !firstName || !lastName) {
      setError('All fields are required');
      return false;
    }

    // validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return false;
    }

    // validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    // verify passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Form submitted");
    
    if (!validateForm()) {
      console.log("Form validation failed");
      return;
    }
    
    console.log("Form validation passed");
    setLoading(true);
    
    try {
      // Create user with Firebase auth
      console.log("Attempting to create user with Firebase auth...");
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );
      
      console.log("User created successfully:", userCredential);
      const user = userCredential.user;
      
      // Update user profile with display name
      console.log("Updating user profile...");
      await updateProfile(user, {
        displayName: `${formData.firstName} ${formData.lastName}`
      });
      console.log("User profile updated successfully");
      
      // Store user data in firestore
      console.log("Storing user data in Firestore...");
      await setDoc(doc(db, "users", user.uid), {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        createdAt: new Date().toISOString()
      });
      console.log("User data stored in Firestore successfully");
      
      console.log("Signup successful, navigating to dashboard");
      
      // Force a redirect
      console.log("Attempting navigation to /dashboard");
      navigate('/dashboard');
      
      // If direct navigation doesn't work, try with a delay and replace history
      setTimeout(() => {
        console.log("Attempting delayed navigation with replace");
        navigate('/dashboard', { replace: true });
      }, 1000);
      
    } catch (error) {
      console.error('Signup error:', error);
      
      // Error handling common Firebase errors
      switch (error.code) {
        case 'auth/email-already-in-use':
          setError('This email is already in use. Try logging in instead.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email format.');
          break;
        case 'auth/weak-password':
          setError('Password is too weak. Please use a stronger password.');
          break;
        default:
          setError(`Failed to create an account: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Debug navigation object
  console.log("Navigate function available:", !!navigate);

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow">
            <Card.Body className="p-4">
              <h2 className="text-center mb-4">Create an Account</h2>
              
              {error && (
                <Alert variant="danger" className="mb-4">
                  {error}
                </Alert>
              )}
              
              <Form onSubmit={handleSubmit}>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>First Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Last Name</Form.Label>
                      <Form.Control
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
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
                
                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                  <Form.Text className="text-muted">
                    Password must be at least 6 characters long.
                  </Form.Text>
                </Form.Group>
                
                <Form.Group className="mb-4">
                  <Form.Label>Confirm Password</Form.Label>
                  <Form.Control
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                  />
                </Form.Group>
                
                <div className="d-grid mb-3">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? 'Creating Account...' : 'Sign Up'}
                  </Button>
                </div>
                
                <p className="text-center mb-0">
                  Already have an account? <Link to="/login">Log in</Link>
                </p>
              </Form>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
}

export default SignUp;