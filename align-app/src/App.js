import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import CalendarPage from './pages/CalendarPage';
import 'bootstrap/dist/css/bootstrap.min.css';


function App() {
  return (
     <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;