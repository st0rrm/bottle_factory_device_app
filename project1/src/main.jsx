import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered:', registration);
      })
      .catch(error => {
        console.log('SW registration failed:', error);
      });
  });
}

// Fix viewport height for iOS Safari
const setViewportHeight = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};

// Set viewport height at multiple points to ensure it applies
setViewportHeight(); // Immediate
setTimeout(setViewportHeight, 0); // Next event loop
setTimeout(setViewportHeight, 100); // After 100ms
document.addEventListener('DOMContentLoaded', setViewportHeight); // DOM ready
window.addEventListener('load', setViewportHeight); // All resources loaded
window.addEventListener('resize', setViewportHeight); // Window resize
window.addEventListener('orientationchange', setViewportHeight); // Screen rotation

createRoot(document.getElementById('root')).render(
  <App />
)
