import React from 'react';
import './VerificationCodeView.css';

export default function VerificationCodeView({
  verificationCode,
  isError,
  attempts,
  maxAttempts,
  timer,
  onNumberClick,
  onDelete,
  onBackToPhone,
}) {
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="verification-code-view">
      {/* Title */}
      <div className="verification-title">
        {isError ? (
          <h2 className="verification-error-heading">
            인증번호가 일치하지 않습니다 ({attempts}/{maxAttempts})
          </h2>
        ) : (
          <>
            <h2 className="verification-heading">입력하신 전화번호로</h2>
            <h3 className="verification-subheading">인증번호가 발신되었습니다</h3>
          </>
        )}
      </div>

      {/* Verification Code Input Boxes */}
      <div className="verification-boxes">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div
            key={index}
            className={`verification-box ${isError ? 'verification-box-error' : ''}`}
          >
            {verificationCode[index] || ""}
          </div>
        ))}
      </div>

      {/* Number Pad */}
      <div className="number-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => onNumberClick(num.toString())}
            className="number-button"
          >
            {num}
          </button>
        ))}
        <div className="number-button-spacer" />
        <button
          onClick={() => onNumberClick("0")}
          className="number-button"
        >
          0
        </button>
        <button
          onClick={onDelete}
          className="number-button delete-button"
        >
          <svg className="delete-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
          </svg>
        </button>
      </div>

      {/* Bottom Actions */}
      <div className="verification-actions">
        <button
          onClick={onBackToPhone}
          className="back-button"
        >
          <svg className="back-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          전화번호 재입력
        </button>
        <div className="timer-display">{formatTimer(timer)}</div>
      </div>
    </div>
  );
}
