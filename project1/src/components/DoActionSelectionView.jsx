import React from 'react';
import './DoActionSelectionView.css';

export default function DoActionSelectionView({ selectedActions, onToggleAction, onConfirm }) {
  const actions = [
    { id: 'tumbler', label: '텀블러 사용', icon: '☕', score: 10 },
    { id: 'bag', label: '장바구니 사용', icon: '🛍️', score: 10 },
    { id: 'transport', label: '대중교통 이용', icon: '🚌', score: 10 },
    { id: 'recycle', label: '분리수거', icon: '♻️', score: 10 },
  ];

  const isSelected = (actionId) => selectedActions.includes(actionId);

  return (
    <div className="do-action-selection-view">
      {/* Title */}
      <div className="do-action-title">
        <h2 className="do-action-heading">친환경 실천을 행동</h2>
        <h3 className="do-action-subheading">미완성 페이지입니다.</h3>
      </div>

      {/* Action Grid */}
      <div className="do-action-grid">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onToggleAction(action.id)}
            className={`do-action-card ${isSelected(action.id) ? 'do-action-card-selected' : ''}`}
          >
            <div className="do-action-icon">{action.icon}</div>
            <div className="do-action-label">{action.label}</div>
            {isSelected(action.id) && (
              <div className="do-action-check">✓</div>
            )}
          </button>
        ))}
      </div>

      {/* Selected Count */}
      <div className="do-action-count">
        선택된 항목: <span className="count-number">{selectedActions.length}</span>
      </div>

      {/* Confirm Button */}
      <button
        onClick={onConfirm}
        className="do-action-confirm-button"
        disabled={selectedActions.length === 0}
      >
        선택완료
      </button>
    </div>
  );
}
