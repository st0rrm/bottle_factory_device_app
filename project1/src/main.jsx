import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// ✅ Service Worker 등록 (Firebase 요청 제외 버전)
// 기존 Service Worker를 제거하고 새로운 버전으로 교체
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      // 1. 기존에 등록된 Service Worker 모두 제거 (한 번만)
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 0) {
        console.log('🔄 기존 Service Worker 제거 중...');
        for (const registration of registrations) {
          await registration.unregister();
        }

        // 캐시 스토리지도 삭제
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        }
        console.log('✅ 기존 Service Worker 제거 완료');
      }

      // 2. 새로운 Service Worker 등록 (Firebase 요청 제외 버전)
      const registration = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none' // 항상 최신 sw.js 사용
      });

      console.log('✅ Service Worker 등록 완료 (Firebase 요청 제외)');

      // Service Worker 업데이트 체크
      registration.addEventListener('updatefound', () => {
        console.log('🔄 새로운 Service Worker 발견, 업데이트 중...');
      });

    } catch (error) {
      console.error('❌ Service Worker 등록 실패:', error);
    }
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
