import React from 'react';
import returnMeCupImage from '../assets/images/returnmecup.svg';
import bottlePointIcon from '../assets/images/bottlepoint_icon.svg';
import xIcon from '../assets/images/x_icon.svg';
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
          <img src={xIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
        </button>

        <div className="return-confirmation-content">
          {/* Heading */}
          <h2 className="return-confirmation-heading">리턴미컵 반납을 진행합니다</h2>

          {/* Cup with Quantity */}
          <div className="return-cup-quantity-display">
            <img src={returnMeCupImage} alt="Return Me Cup" className="return-confirmation-cup-svg" />
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
              <img src={bottlePointIcon} alt="Bottle Point" className="bottle-icon" />
              <span className="return-reward-value">
                <span className="reward-number">{rewardPoints}</span>
                <span className="reward-text">보틀</span>
              </span>
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
