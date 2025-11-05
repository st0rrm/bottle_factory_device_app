import React, { useEffect, useState } from 'react';
import './SuccessSnackbar.css';

export default function SuccessSnackbar({ message, onClose, duration = 3000 }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // duration - 300ms 후 페이드아웃 시작
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, duration - 300);

    // duration 후 완전히 닫기
    const closeTimer = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(closeTimer);
    };
  }, [duration, onClose]);

  return (
    <div className={`success-snackbar ${fadeOut ? 'fade-out' : ''}`}>
      <div className="snackbar-content">
        <div className="snackbar-background" />
        <div className="snackbar-text">{message}</div>
      </div>
    </div>
  );
}
