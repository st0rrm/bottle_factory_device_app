import './App.css'
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginScreen from './pages/login/login.jsx';
import HomeScreen from './pages/home/home.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
const BASE_NAME = "/bottle_factory_device_app/";

function App() {
  return (
    <HashRouter basename={BASE_NAME}>
      <div className="App">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/home/:cafeId" element={<HomeScreen />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
      </div>
    </HashRouter>
  );
}

export default App;
