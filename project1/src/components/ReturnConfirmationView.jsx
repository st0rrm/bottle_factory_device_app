import React from 'react';
import './ReturnConfirmationView.css';

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
          <svg className="return-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2" strokeLinecap="round" />
            <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="return-confirmation-content">
          {/* Heading */}
          <h2 className="return-confirmation-heading">리턴미컵 반납을 진행합니다</h2>

          {/* Cup with Quantity */}
          <div className="return-cup-quantity-display">
            <svg width="180" height="220" viewBox="0 0 180 220" fill="none" className="return-confirmation-cup-svg">
              {/* Cup lid */}
              <rect x="40" y="20" width="100" height="30" rx="8" fill="#0c2950" />
              <rect x="30" y="45" width="120" height="8" rx="4" fill="#0c2950" />
              {/* Cup body */}
              <path d="M 50 60 L 60 180 L 120 180 L 130 60 Z" fill="#e9edef" stroke="#d9d9d9" strokeWidth="2" />
              <text x="90" y="120" textAnchor="middle" fill="#9c9c9c" fontSize="14" fontFamily="Arial">
                Return Me
              </text>
            </svg>
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
