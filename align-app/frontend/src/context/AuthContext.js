import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// provider component that wraps the app and makes auth object available to any child component that calls useAuth()
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing token and user data
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      setCurrentUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const signup = async (email, password, firstName, lastName) => {
    try {
      const response = await axios.post('http://localhost:3002/api/signup', {
        email,
        password,
        firstName,
        lastName
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setCurrentUser(user);
      return user;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to create account');
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post('http://localhost:3002/api/login', {
        email,
        password
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setCurrentUser(user);
      return user;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to login');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
  };

  const resetPassword = async (email) => {
    try {
      await axios.post('http://localhost:3002/api/reset-password', { email });
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to reset password');
    }
  };

  const updateEmail = async (email) => {
    try {
      const response = await axios.put('http://localhost:3002/api/user/email', 
        { email },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      const updatedUser = { ...currentUser, email };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setCurrentUser(updatedUser);
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to update email');
    }
  };

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
    updateEmail,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}