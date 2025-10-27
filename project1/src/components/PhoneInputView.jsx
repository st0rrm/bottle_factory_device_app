import React from 'react';
import './PhoneInputView.css';

export default function PhoneInputView({ phoneNumber, onNumberClick, onDelete, onConfirm, title = "리턴미컵 대여를 위해" }) {
  const formatPhoneNumber = (num) => {
    if (num.length <= 3) return num;
    if (num.length <= 7) return `${num.slice(0, 3)} - ${num.slice(3)}`;
    return `${num.slice(0, 3)} - ${num.slice(3, 7)} - ${num.slice(7)}`;
  };

  return (
    <div className="phone-input-view">
      {/* Title */}
      <div className="phone-input-title">
        <h2 className="phone-input-heading">{title}</h2>
        <h3 className="phone-input-subheading">전화번호를 입력해주세요</h3>
        <p className="phone-input-notice">
          전화번호 입력 시, <span className="notice-link">개인정보처리 약관</span>에 동의한 것으로
          처리됩니다.
        </p>
      </div>

      {/* Phone Number Display */}
      <div className="phone-display-section">
        <div className="phone-display">
          {formatPhoneNumber(phoneNumber)}
          <span className="cursor-blink">|</span>
        </div>
        <div className="phone-display-underline" />
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

      {/* Confirm Button */}
      <button
        disabled={phoneNumber.length < 11}
        onClick={onConfirm}
        className={`confirm-button ${phoneNumber.length >= 11 ? 'confirm-button-active' : 'confirm-button-disabled'}`}
      >
        확인
      </button>
    </div>
  );
}
