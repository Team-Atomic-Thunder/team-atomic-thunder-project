import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css'; // Reusing the same CSS file

/**
 * SignUp component for new user registration
 */
const SignUp = () => {
  // For navigation after signup
  const navigate = useNavigate();
  
  // Error message state
  const [error, setError] = useState('');
  
  // All the form fields
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });

  // Update form data when user types
  const handleChange = (e) => {
    // Get the field name and new value
    const fieldName = e.target.name;
    const newValue = e.target.value;
    
    // Update the state with new values
    setFormData({
      ...formData, // keep all existing data
      [fieldName]: newValue // update just this field
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    // Stop the form from actually submitting
    e.preventDefault();
    
    // For debugging - remove later
    console.log('Signup attempted with:', formData);
    
    try {
      // Here we would normally call an API
      // But for now we'll just create a fake token
      
      // Create a token with timestamp to make it unique
      const mockToken = 'mock-jwt-token-' + Date.now();
      localStorage.setItem('token', mockToken);
      
      // Save first name for welcome message maybe
      localStorage.setItem('userName', formData.firstName);
      
      // Go to dashboard page
      navigate('/dashboard');
    } catch (error) {
      // If something goes wrong, show the error
      console.error('Signup failed:', error);
      setError('Could not create your account. Please try again.');
    }
  };

  // This is just for validation
  const isPasswordValid = () => {
    return formData.password.length >= 6;
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Sign Up</h2>
        
        {/* Show error if any */}
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {/* First Name */}
          <div className="form-group">
            <label htmlFor="firstName">First Name</label>
            <input
              type="text"
              id="firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              placeholder="Enter your first name"
            />
          </div>

          {/* Last Name */}
          <div className="form-group">
            <label htmlFor="lastName">Last Name</label>
            <input
              type="text"
              id="lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              placeholder="Enter your last name"
            />
          </div>

          {/* Email Address */}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="yourname@example.com"
            />
          </div>

          {/* Password */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Choose a secure password"
            />
            {/* Show a little helper text for password requirements */}
            <small className="text-muted">Password must be at least 6 characters</small>
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="submit-button"
            disabled={!isPasswordValid()}
          >
            Sign Up
          </button>
        </form>

        {/* Link to login page */}
        <p className="toggle-auth">
          Already have an account? <Link to="/login" className="toggle-button">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default SignUp;