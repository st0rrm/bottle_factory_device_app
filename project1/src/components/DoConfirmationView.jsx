import React from 'react';
import './DoConfirmationView.css';
import xIcon from '../assets/images/x_icon.svg';

import cupIcon from '../assets/images/do_confirm_cup.png';
import refillIcon from '../assets/images/do_confirm_refill.png';
import containerIcon from '../assets/images/do_confirm_container.png';
import recycleIcon from '../assets/images/do_confirm_recycle.png';

export default function DoConfirmationView({
  selectedActions,
  onClose,
  onCancel,
  onConfirm,
  isLoading,
}) {
  // 👉 선택 시 사용한 id들과 맞춰주기 (tumbler / container / refill / recycle)
  const actionMeta = {
    tumbler:   { label: '텀블러 사용', icon: cupIcon,       score: 10 },
    container: { label: '다회용기',   icon: containerIcon, score: 10 },
    refill:    { label: '리필용기',   icon: refillIcon,    score: 10 },
    recycle:   { label: '자원 순환',  icon: recycleIcon,   score: 10 },
  };

  // 👉 selectedActions 배열을 종류별로 묶어서 개수 세기
  //    예: ['tumbler','tumbler','recycle'] → { tumbler: 2, recycle: 1 }
  const countsByActionId = selectedActions.reduce((acc, id) => {
    if (!actionMeta[id]) return acc;
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});

  // 👉 렌더링용 배열로 변환
  const summaryList = Object.entries(countsByActionId).map(([id, count]) => ({
    id,
    count,
    ...actionMeta[id],
  }));

  // ✅ 행동별 score * 개수 합산해서 최종 보상 계산
  const totalScore = summaryList.reduce(
    (sum, item) => sum + item.score * item.count,
    0
  );

  return (
    <div className="do-confirmation-overlay">
      <div className="do-confirmation-container">
        <button onClick={onClose} className="do-confirmation-close-button">
          <img src={xIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
        </button>

        <div className="do-confirmation-content">
          {/* Title */}
          <div className="do-confirmation-title">
            <h2 className="do-confirmation-heading">“일회용품 안 주셔도 괜찮아요!”</h2>
            {/* <p className="do-confirmation-subheading">아래 내용으로 기록됩니다</p> */}
          </div>

          {/* Selected Actions List */}
          <div className="do-confirmation-list">
            {summaryList.map((item) => (
              <div key={item.id} className="do-confirmation-item">
                <div className="do-confirmation-item-circle">
                  <img
                    src={item.icon}
                    alt={item.label}
                    className="do-confirmation-item-icon"
                  />
                </div>

                <div className="do-confirmation-item-text">
                  <div className="do-confirmation-item-count-row">
                    <span className="do-confirmation-item-count">{item.count}</span>
                    <span className="do-confirmation-item-unit">개</span>
                  </div>
                  <div className="do-confirmation-item-label">{item.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Total Score */}
          <div className="do-confirmation-total">
            <span className="do-confirmation-total-label">보상</span>
            <span className="do-confirmation-total-score">
              {totalScore} 보틀
            </span>
          </div>

          {/* Buttons */}
          <div className="do-confirmation-buttons">
            <div
              onClick={onCancel}
              className="do-confirmation-cancel-button"
              disabled={isLoading}
            >
              뒤로
            </div>
            <div
              onClick={onConfirm}
              className="do-confirmation-confirm-button"
              disabled={isLoading}
            >
              {isLoading ? '처리 중...' : '확인'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
