import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';

// Login page component
const Login = () => {
  const navigate = useNavigate();
  // Track any errors during login
  const [error, setError] = useState('');
  // Store form data
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // Handle input changes - update the right field in state
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Process the form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // TODO: Replace with actual auth API call later
      // For now just create fake token and log in
      console.log('Logging in with:', formData.email);
      const mockToken = 'mock-jwt-token-' + Date.now();
      localStorage.setItem('token', mockToken);
      
      // Go to dashboard after successful login
      navigate('/dashboard');
    } catch (err) {
      // Show error if login fails
      console.error('Login error:', err);
      setError('Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-form">
        <h2>Login</h2>
        
        {/* Show error message if there is one */}
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {/* Email field */}
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

          {/* Password field */}
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
            />
          </div>

          {/* Remember me option could go here */}

          {/* Submit button */}
          <button type="submit" className="submit-button">
            Login
          </button>
        </form>

        {/* Link to sign up page */}
        <p className="toggle-auth">
          Don't have an account? <Link to="/signup" className="toggle-button">Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

// Export the component
export default Login;