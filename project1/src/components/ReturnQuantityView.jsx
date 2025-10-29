import React, { useState } from 'react';
import returnMeCupImage from '../assets/images/returnmecup.svg';
import './ReturnQuantityView.css';
<<<<<<< HEAD
import returnmecup from '../assets/images/returnmecup.svg';
import xIcon from '../assets/images/x_icon.svg';
=======
>>>>>>> 860a6d0a6a8f54932c1a3ceeccd3e85dd2527364

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
          <img src={xIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
        </button>

        <div className="return-quantity-content">
          {/* Heading */}
          <h2 className="return-quantity-heading">반납할 리턴미컵</h2>
          <p className="return-quantity-subheading">수량을 선택해주세요</p>

          {/* Cup Illustration */}
          <div className="return-cup-illustration">
            <img src={returnMeCupImage} alt="Return Me Cup" className="return-cup-svg" />
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
