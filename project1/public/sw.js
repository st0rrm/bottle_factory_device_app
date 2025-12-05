// Service Worker for PWA - Firebase 호환 버전
// Firebase/Firestore 요청은 Service Worker를 거치지 않고 직접 처리

const CACHE_VERSION = 'v1.0.1';

self.addEventListener('install', (event) => {
  console.log('[SW] 설치 중... 버전:', CACHE_VERSION);
  // Skip waiting to activate immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] 활성화됨');
  // Claim clients immediately
  event.waitUntil(clients.claim());
});

// Fetch event - Firebase 요청은 건드리지 않음
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // ✅ Firebase/Google 관련 요청은 Service Worker 건너뜀
  // 브라우저가 직접 처리하도록 하여 CORS 문제 방지
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebasestorage.googleapis.com') ||
    url.hostname.includes('firebase.com') ||
    url.hostname.includes('google.com') ||
    url.hostname.includes('gstatic.com')
  ) {
    // Service Worker를 거치지 않고 브라우저가 직접 처리
    return;
  }

  // ✅ 나머지 요청은 네트워크로 pass-through (캐싱 없음)
  event.respondWith(
    fetch(event.request).catch(error => {
      console.error('[SW] Fetch 실패:', event.request.url, error);
      // 네트워크 실패 시 에러 전파 (캐시 fallback 없음)
      return Promise.reject(error);
    })
  );
});
