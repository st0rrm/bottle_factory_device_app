import './App.css'
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen from './pages/login/login.jsx';
import HomeScreen from './pages/home/home.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import CafeStats from './pages/cafe/CafeStats.jsx';
import { BackgroundProvider } from './contexts/BackgroundContext';

function App() {
  return (
    <BackgroundProvider>
      <BrowserRouter>
        <div className="App">
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/home/:cafeId" element={<HomeScreen />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/cafe-stats" element={<CafeStats />} />
          </Routes>
        </div>
      </BrowserRouter>
    </BackgroundProvider>
  );
}

export default App;
