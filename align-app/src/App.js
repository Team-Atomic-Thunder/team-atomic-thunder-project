import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import HomePage from './HomePage';

function App() {
  return (
    <Router>
      <div className="d-flex flex-column min-vh-100">
        {/* Simple Header */}
        <header className="bg-dark text-white p-3">
          <div className="container">
            <h1 className="h4 mb-0">Align</h1>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-grow-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            {/* Other routes would go here in the future */}
            <Route path="*" element={<HomePage />} />
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