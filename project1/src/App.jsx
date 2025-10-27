import './App.css'
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen from './pages/login/login.jsx';
import HomeScreen from './pages/home/home.jsx';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/home/:cafeId" element={<HomeScreen />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
