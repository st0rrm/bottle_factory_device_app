import React from 'react';
import './ReturnConfirmationView.css';
import returnmecup from '../assets/images/returnmecup.svg';
import xIcon from '../assets/images/x_icon.svg';

export default function ReturnConfirmationView({
  quantity,
  onClose,
  onCancel,
  onConfirm,
}) {
  const rewardPoints = quantity * 20; // 20 bottles per cup

  return (
    <div className="return-confirmation-overlay">
      <div className="return-confirmation-modal">
        {/* Close Button */}
        <button onClick={onClose} className="return-confirmation-close-button">
          <img src={xIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
        </button>

        <div className="return-confirmation-content">
          {/* Heading */}
          <h2 className="return-confirmation-heading">리턴미컵 반납을 진행합니다</h2>

          {/* Cup with Quantity */}
          <div className="return-cup-quantity-display">
            <img src={returnmecup} alt="Return Me Cup" />
            <div className="return-confirmation-quantity">×{quantity}</div>
          </div>

          {/* Reward Section */}
          <div className="return-reward-section">
            <div className="reward-label-group">
              <span className="reward-label-text">보상</span>
              <button className="reward-help-button">
                <span className="help-question-mark">?</span>
              </button>
            </div>
            <div className="reward-value-group">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="bottle-icon">
                <circle cx="12" cy="12" r="10" fill="#497fc6" />
                <text x="12" y="16" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
                  B
                </text>
              </svg>
              <span className="return-reward-value">{rewardPoints}보틀</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="return-action-buttons">
            <button onClick={onCancel} className="return-cancel-button">
              취소
            </button>
            <button onClick={onConfirm} className="return-confirm-action-button">
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
