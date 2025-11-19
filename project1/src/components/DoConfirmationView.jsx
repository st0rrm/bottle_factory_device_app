import React from 'react';
import './DoConfirmationView.css';
import xIcon from '../assets/images/x_icon.svg';

import cupIcon from '../assets/images/do_confirm_cup.png';
import refillIcon from '../assets/images/do_confirm_refill.png';
import containerIcon from '../assets/images/do_confirm_container.png';
import recycleIcon from '../assets/images/do_confirm_recycle.png';


export default function DoConfirmationView({ selectedActions, onClose, onCancel, onConfirm, isLoading }) {
  const actionLabels = {
    tumbler: { label: '텀블러 사용', icon: cupIcon, score: 10 },
    bag: { label: '장바구니 사용', icon: refillIcon, score: 10 },
    transport: { label: '대중교통 이용', icon: containerIcon, score: 10 },
    recycle: { label: '분리수거', icon: recycleIcon, score: 10 },
  };

  const totalScore = selectedActions.length * 10;

  return (
    <div className="do-confirmation-overlay">
      <div className="do-confirmation-container">
        <button onClick={onClose} className="do-confirmation-close-button">
          <img src={xIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
        </button>

        <div className="do-confirmation-content">
          {/* Title */}
          <div className="do-confirmation-title">
            <h2 className="do-confirmation-heading">실천 내역 확인</h2>
            <p className="do-confirmation-subheading">아래 내용으로 기록됩니다</p>
          </div>

          {/* Selected Actions List */}
          <div className="do-confirmation-list">
            {selectedActions.map((actionId) => {
              const action = actionLabels[actionId];
              return (
                <div key={actionId} className="do-confirmation-item">
                  <div className="do-confirmation-item-icon">{action.icon}</div>
                  <div className="do-confirmation-item-label">{action.label}</div>
                  <div className="do-confirmation-item-score">+{action.score}점</div>
                </div>
              );
            })}
          </div>

          {/* Total Score */}
          <div className="do-confirmation-total">
            <span className="do-confirmation-total-label">총 획득 점수</span>
            <span className="do-confirmation-total-score">{totalScore}점</span>
          </div>

          {/* Buttons */}
          <div className="do-confirmation-buttons">
            <button
              onClick={onCancel}
              className="do-confirmation-button do-confirmation-cancel-button"
              disabled={isLoading}
            >
              취소
            </button>
            <button
              onClick={onConfirm}
              className="do-confirmation-button do-confirmation-confirm-button"
              disabled={isLoading}
            >
              {isLoading ? '처리 중...' : '확인'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
