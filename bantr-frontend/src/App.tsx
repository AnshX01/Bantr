import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './components/Login';
import MeetingDashboard from './components/MeetingDashboard';
import MeetingRoom from './components/MeetingRoom';

function App() {
  const isAuthenticated = !!localStorage.getItem("token");

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to={isAuthenticated ? "/home" : "/login"} />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/meetings" element={<MeetingDashboard />} />
        <Route path="/meetings/:meetingId" element={<MeetingRoom />} />
      </Routes>
    </Router>
  );
}

export default App;
