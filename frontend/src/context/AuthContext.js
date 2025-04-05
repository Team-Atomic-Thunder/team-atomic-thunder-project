import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

// provider component that wraps the app and makes auth object available to any child component that calls useAuth()
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  function signup(email, password) {
    // call Firebase's createUserWithEmailAndPassword
    // for now simulate creating a user and storing in localStorage
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = { email, uid: `user-${Date.now()}` };
        localStorage.setItem('alignUser', JSON.stringify(user));
        setCurrentUser(user);
        resolve(user);
      }, 1000);
    });
  }

  function login(email, password) {
    // call Firebase's signInWithEmailAndPassword
    // For now simulate logging in
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = { email, uid: `user-${Date.now()}` };
        localStorage.setItem('alignUser', JSON.stringify(user));
        setCurrentUser(user);
        resolve(user);
      }, 1000);
    });
  }

  function logout() {
    // call Firebase's signOut
    // For now just clear localStorage
    return new Promise((resolve) => {
      localStorage.removeItem('alignUser');
      setCurrentUser(null);
      resolve();
    });
  }

  function resetPassword(email) {
    //call Firebase's sendPasswordResetEmail
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Password reset email sent to ${email}`);
        resolve();
      }, 1000);
    });
  }

  function updateEmail(email) {
    // call Firebase's updateEmail
    return new Promise((resolve) => {
      setTimeout(() => {
        const user = { ...currentUser, email };
        localStorage.setItem('alignUser', JSON.stringify(user));
        setCurrentUser(user);
        resolve();
      }, 1000);
    });
  }

  function updatePassword(password) {
    // call Firebase's updatePassword
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log('Password updated');
        resolve();
      }, 1000);
    });
  }

  // Check if user is already logged in
  useEffect(() => {
    const user = localStorage.getItem('alignUser');
    if (user) {
      setCurrentUser(JSON.parse(user));
    }
    setLoading(false);
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
    updateEmail,
    updatePassword
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}