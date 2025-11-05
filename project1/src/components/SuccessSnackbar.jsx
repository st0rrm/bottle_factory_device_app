import React, { useEffect } from 'react';
import './SuccessSnackbar.css';

export default function SuccessSnackbar({ message, onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className="success-snackbar">
      <div className="snackbar-content">
        <div className="snackbar-background" />
        <div className="snackbar-text">{message}</div>
      </div>
    </div>
  );
}
