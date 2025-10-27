import React, { useState } from 'react';
import './QuantitySelectionView.css';

export default function QuantitySelectionView({
  quantity,
  availableVouchers,
  onIncrement,
  onDecrement,
  onConfirm,
}) {
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  return (
    <div className="quantity-selection-view">
      {/* Title */}
      <div className="quantity-title">
        <h2 className="quantity-heading">대여할 리턴미컵</h2>
        <h3 className="quantity-subheading">수량을 선택해주세요</h3>
      </div>

      {/* Cup Illustration */}
      <div className="cup-illustration">
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
      </div>

      {/* Available Vouchers */}
      <div className="voucher-info">
        <p className="voucher-text">
          사용 가능 대여권 : <span className="voucher-count">{availableVouchers}</span>
        </p>
      </div>

      {/* Quantity Selector */}
      <div className="quantity-selector">
        <button
          onClick={onDecrement}
          disabled={quantity <= 1}
          className={`quantity-button ${quantity <= 1 ? 'quantity-button-disabled' : 'quantity-button-minus'}`}
        >
          <svg className="quantity-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="quantity-display">{quantity}</div>

        <button
          onClick={onIncrement}
          disabled={quantity >= availableVouchers}
          className={`quantity-button ${quantity >= availableVouchers ? 'quantity-button-disabled' : 'quantity-button-plus'}`}
        >
          <svg className="quantity-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="12" y1="5" x2="12" y2="19" strokeWidth="2" strokeLinecap="round"/>
            <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      {/* Information Text */}
      <div className="quantity-info">
        <p className="info-text">
          대여기간 이내에 컵을 반납하면 대여권을 돌려받습니다.
          <br />
          <button
            onClick={() => setShowDownloadModal(true)}
            className="info-link"
          >
            보틀클럽
          </button>{" "}
          앱을 통해 대여권을 추가 구매할 수 있습니다.
        </p>
      </div>

      {/* Confirm Button */}
      <button onClick={onConfirm} className="quantity-confirm-button">
        확인
      </button>

      {showDownloadModal && (
        <div className="download-modal-placeholder">
          <p>BottleClubDownloadModal 구현 필요</p>
          <button onClick={() => setShowDownloadModal(false)}>닫기</button>
        </div>
      )}
    </div>
  );
}
