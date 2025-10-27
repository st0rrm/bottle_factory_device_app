import React, { useState } from 'react';
import './RentalConfirmationView.css';

export default function RentalConfirmationView({
  quantity,
  smsNotification,
  onToggleSms,
  onCancel,
  onConfirm,
}) {
  const [showRewardsInfo, setShowRewardsInfo] = useState(false);

  const today = new Date();
  const returnDate = new Date(today);
  returnDate.setDate(returnDate.getDate() + 14);

  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <div className="rental-confirmation-view">
      {/* Title */}
      <div className="confirmation-title">
        <h2 className="confirmation-heading">리턴미컵 대여를 진행합니다</h2>
      </div>

      {/* Cup Illustration with Quantity */}
      <div className="cup-quantity-display">
        <div className="cup-container">
          {/* Cup body */}
          <div className="cup-body">
            <div className="cup-label">Return Me</div>
            {/* Cup shine effect */}
            <div className="cup-shine" />
          </div>
          {/* Cup lid */}
          <div className="cup-lid-top" />
          <div className="cup-lid-bottom" />
        </div>
        <div className="quantity-multiplier">×{quantity}</div>
      </div>

      {/* Rental Information */}
      <div className="rental-info">
        {/* Rental Date */}
        <div className="info-row">
          <span className="info-label">대여 일자</span>
          <span className="info-value">{formatDate(today)}</span>
        </div>

        {/* Return Date */}
        <div className="info-row">
          <span className="info-label">반납 일자</span>
          <span className="info-value">{formatDate(returnDate)}</span>
        </div>

        {/* Reward */}
        <div className="info-row">
          <div className="reward-label-container">
            <span className="info-label">보상</span>
            <button
              onClick={() => setShowRewardsInfo(true)}
              className="help-button"
            >
              <svg className="help-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="17" r="0.5" fill="currentColor" strokeWidth="0" />
              </svg>
            </button>
          </div>
          <div className="reward-value-container">
            <svg className="coins-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="8" cy="8" r="6" strokeWidth="2" />
              <path d="M18.09 10.37A6 6 0 1 1 10.34 18" strokeWidth="2" />
              <circle cx="16" cy="16" r="6" strokeWidth="2" />
            </svg>
            <span className="reward-value">20보틀</span>
          </div>
        </div>
      </div>

      {/* SMS Notification Checkbox */}
      <div className="sms-notification-container">
        <button
          onClick={onToggleSms}
          className={`sms-toggle-button ${smsNotification ? 'sms-active' : 'sms-inactive'}`}
        >
          <div className={`checkbox-circle ${smsNotification ? 'checkbox-checked' : 'checkbox-unchecked'}`}>
            {smsNotification && (
              <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="20 6 9 17 4 12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <span className={`sms-text ${smsNotification ? 'sms-text-active' : 'sms-text-inactive'}`}>
            반납일자 알림 문자를 받겠습니다.
          </span>
        </button>
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button onClick={onCancel} className="cancel-button">
          취소
        </button>
        <button onClick={onConfirm} className="confirm-button">
          확인
        </button>
      </div>

      {showRewardsInfo && (
        <div className="rewards-modal-placeholder">
          <p>RewardsInfoModal 구현 필요</p>
          <button onClick={() => setShowRewardsInfo(false)}>닫기</button>
        </div>
      )}
    </div>
  );
}
