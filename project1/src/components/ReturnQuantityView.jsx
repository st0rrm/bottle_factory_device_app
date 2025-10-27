import React, { useState } from 'react';
import './ReturnQuantityView.css';

export default function ReturnQuantityView({ onClose, onConfirm }) {
  const [quantity, setQuantity] = useState(1);
  const rentedCups = 2; // This would come from user data

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleIncrement = () => {
    if (quantity < rentedCups) {
      setQuantity(quantity + 1);
    }
  };

  const handleConfirm = () => {
    onConfirm(quantity);
  };

  return (
    <div className="return-quantity-overlay">
      <div className="return-quantity-modal">
        {/* Close Button */}
        <button onClick={onClose} className="return-close-button">
          <svg className="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2" strokeLinecap="round" />
            <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="return-quantity-content">
          {/* Heading */}
          <h2 className="return-quantity-heading">반납할 리턴미컵</h2>
          <p className="return-quantity-subheading">수량을 선택해주세요</p>

          {/* Cup Illustration */}
          <div className="return-cup-illustration">
            <svg width="180" height="220" viewBox="0 0 180 220" fill="none" className="return-cup-svg">
              {/* Cup lid */}
              <rect x="40" y="20" width="100" height="30" rx="8" fill="#0c2950" />
              <rect x="30" y="45" width="120" height="8" rx="4" fill="#0c2950" />
              {/* Cup body */}
              <path d="M 50 60 L 60 180 L 120 180 L 130 60 Z" fill="#e9edef" stroke="#d9d9d9" strokeWidth="2" />
              <text x="90" y="120" textAnchor="middle" fill="#9c9c9c" fontSize="14" fontFamily="Arial">
                Return Me
              </text>
            </svg>
          </div>

          {/* Rented Cups Info */}
          <p className="rented-cups-info">
            대여한 리턴미컵 : <span className="rented-cups-count">{rentedCups}</span>
          </p>

          {/* Quantity Selector */}
          <div className="return-quantity-selector">
            <button
              onClick={handleDecrement}
              disabled={quantity <= 1}
              className={`return-quantity-button ${quantity <= 1 ? 'return-button-disabled' : 'return-button-active'}`}
            >
              <svg className="return-quantity-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="5" y1="12" x2="19" y2="12" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </button>

            <div className="return-quantity-display">{quantity}</div>

            <button
              onClick={handleIncrement}
              disabled={quantity >= rentedCups}
              className={`return-quantity-button ${quantity >= rentedCups ? 'return-button-disabled' : 'return-button-active'}`}
            >
              <svg className="return-quantity-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <line x1="12" y1="5" x2="12" y2="19" strokeWidth="3" strokeLinecap="round" />
                <line x1="5" y1="12" x2="19" y2="12" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* Confirm Button */}
          <button onClick={handleConfirm} className="return-confirm-button">
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
