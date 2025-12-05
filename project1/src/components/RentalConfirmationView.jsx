import React, { useState } from 'react';
import './RentalConfirmationView.css';
import returnmecup from '../assets/images/returnmecup.svg';
import RewardsInfoModal from './RewardsInfoModal';

export default function RentalConfirmationView({
  quantity,
  onCancel,
  onConfirm,
}) {
  const [showRewardsInfo, setShowRewardsInfo] = useState(false);

  const today = new Date();
  const returnDate = new Date(today);
  returnDate.setDate(returnDate.getDate() + 14);

  const rewardPoints = quantity * 10; // 10 bottles per cup (반납 시 지급)

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
        <img src={returnmecup} alt="Return Me Cup" />
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

        {/* Bottle Info */}
        <div className="info-row">
          <div className="reward-label-container">
            <span className="info-label" style={{ fontWeight: '700', color: '#4481D1' }}>보틀 적립 안내</span>
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
        </div>
      </div>

      {/* Info Text */}
      <div className="sms-notification-container">
        <div className="sms-info-text">
          보상은 리턴미컵을 반납한 이후 적립됩니다.
        </div>
        <div className="sms-info-text">
          반납일자 알림 문자가 자동으로 발송됩니다.
        </div>
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
        <RewardsInfoModal onClose={() => setShowRewardsInfo(false)} />
      )}
    </div>
  );
}
