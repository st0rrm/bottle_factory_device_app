import React, { useState, useEffect } from 'react';
import './PhoneInputView.css';

export default function PhoneInputView({ phoneNumber, onNumberClick, onDelete, onConfirm, title = "리턴미컵 대여를 위해" }) {
  const [maskedIndices, setMaskedIndices] = useState(new Set());
  const [lastInputIndex, setLastInputIndex] = useState(-1);

  useEffect(() => {
    if (phoneNumber.length > 3) {
      const currentIndex = phoneNumber.length - 1;

      // If there was a previous input, mask it immediately
      if (lastInputIndex >= 3 && lastInputIndex !== currentIndex) {
        setMaskedIndices(prev => new Set([...prev, lastInputIndex]));
      }

      setLastInputIndex(currentIndex);

      // Set timer to mask current input after 0.5s
      const timer = setTimeout(() => {
        setMaskedIndices(prev => new Set([...prev, currentIndex]));
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [phoneNumber]);

  useEffect(() => {
    // Reset masking when phone number is cleared or less than 4 digits
    if (phoneNumber.length <= 3) {
      setMaskedIndices(new Set());
      setLastInputIndex(-1);
    }
  }, [phoneNumber.length]);

  const formatPhoneNumber = (num) => {
    // Keep 010 visible, mask the rest after 0.5s
    const maskedNum = num.split('').map((digit, index) => {
      if (index < 3) return digit; // Keep first 3 digits (010) visible
      return maskedIndices.has(index) ? '*' : digit;
    }).join('');

    if (maskedNum.length <= 3) return maskedNum;
    if (maskedNum.length <= 7) return `${maskedNum.slice(0, 3)} - ${maskedNum.slice(3)}`;
    return `${maskedNum.slice(0, 3)} - ${maskedNum.slice(3, 7)} - ${maskedNum.slice(7)}`;
  };

  return (
    <div className="phone-input-view">
      {/* Title */}
      <div className="phone-input-title">
        <p className="phone-input-heading-combined">
          {title}
          <br />
          <span className="phone-input-subheading-text">전화번호</span>를 입력해주세요
        </p>
        <p className="phone-input-notice">
          전화번호 입력 시, <span className="notice-link">개인정보처리 약관</span>에 동의한 것으로 처리됩니다.
        </p>
      </div>

      {/* Phone Number Display */}
      <div className="phone-display-section">
        <div className="phone-display">
          {formatPhoneNumber(phoneNumber)}
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
