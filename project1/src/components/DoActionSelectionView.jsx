import React from 'react';
import './DoActionSelectionView.css';

import cupImage from '../assets/images/do_image_cup.png';
import refillImage from '../assets/images/do_image_refill.png';
import containerImage from '../assets/images/do_image_container.png';
import recycleImage from '../assets/images/do_image_recycle.png';

// import cupIcon from '../assets/images/do_icon_cup.png';
// import refillIcon from '../assets/images/do_icon_refill.png';
// import containerIcon from '../assets/images/do_icon_container.png';
// import recycleIcon from '../assets/images/do_icon_recycle.png';

import cupIcon from '../assets/images/do_confirm_cup.png';
import refillIcon from '../assets/images/do_confirm_refill.png';
import containerIcon from '../assets/images/do_confirm_container.png';
import recycleIcon from '../assets/images/do_confirm_recycle.png';

export default function DoActionSelectionView({
  selectedActions,
  onToggleAction,
  onRemoveSelectedIndex,
  onConfirm,
  allowedActionIds,
}) {
  const allActions = [
    { id: 'tumbler', label: '텀블러 사용', icon: cupImage, score: 30, miniicon: cupIcon },
    { id: 'container', label: '다회용기', icon: containerImage, score: 30, miniicon: containerIcon},
    { id: 'refill', label: '리필용기', icon: refillImage, score: 30, miniicon: refillIcon},
    { id: 'recycle', label: '자원 순환', icon: recycleImage, score: 5, miniicon: recycleIcon},
  ];

  // ✅ 카페에서 허용된 아이템만 필터링
  const actions = allowedActionIds
    ? allActions.filter(action => allowedActionIds.includes(action.id))
    : allActions;

  console.log('🎯 DoActionSelectionView 렌더링:', {
    allowedActionIds,
    전체아이템수: allActions.length,
    표시할아이템수: actions.length,
    표시할아이템: actions.map(a => a.label)
  });

  // 체크마크용: 하나라도 있으면 선택 상태로 보기
  const isSelected = (actionId) => selectedActions.includes(actionId);

  // 로딩 중이면 표시하지 않음
  if (!allowedActionIds) {
    return (
      <div className="do-action-selection-view">
        <div className="do-action-title">
          <h2 className="do-action-heading">로딩 중...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="do-action-selection-view">
      {/* Title */}
      <div className="do-action-title">
        <h2 className="do-action-heading">친환경 실천을 위한 <br></br> 행동을 선택해주세요</h2>
        {/* <h3 className="do-action-subheading">행동을 선택해주세요</h3> */}
      </div>

      <div className="do-action-main">
        {/* Action Grid */}
        <div className="do-action-grid">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => onToggleAction(action.id)}
              className={`do-action-card ${isSelected(action.id) ? 'do-action-card-selected' : ''}`}
            >
              <img
                className="do-action-icon-image"
                src={action.icon}
                alt={action.label}
              />
              <div className="do-action-label">{action.label}</div>

              {isSelected(action.id) && <div className="do-action-check">✓</div>}
            </button>
          ))}
        </div>

        {/* Selected Mini Icons Row (5칸) */}
        <div className="do-action-selected-row">
          {Array.from({ length: 5 }).map((_, index) => {
            const actionId = selectedActions[index];
            const action = allActions.find((a) => a.id === actionId);
            const hasAction = !!action;

            return (
              <div
                key={index}
                className={`do-action-selected-slot ${
                  hasAction ? 'do-action-selected-slot-filled' : ''
                }`}
              >
                {hasAction && (
                  <>
                    <img
                      className="do-action-selected-icon"
                      src={action.miniicon}
                      alt={action.label}
                    />
                    <button
                      type="button"
                      className="do-action-selected-remove"
                      onClick={() => onRemoveSelectedIndex(index)}
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirm Button */}
      <button
        type="button"
        onClick={onConfirm}
        className="do-action-confirm-button"
        disabled={selectedActions.length === 0}
      >
        선택 완료!
      </button>
    </div>
  );
}
