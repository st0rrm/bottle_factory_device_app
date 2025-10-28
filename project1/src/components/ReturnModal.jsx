import React, { useState } from 'react';
import PhoneInputView from './PhoneInputView';
import QRCodeView from './QRCodeView';
import ReturnQuantityView from './ReturnQuantityView';
import ReturnConfirmationView from './ReturnConfirmationView';
import './ReturnModal.css';

export default function ReturnModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('phone');
  const [step, setStep] = useState('verification');
  const [returnQuantity, setReturnQuantity] = useState(1);

  const handleQuantityConfirm = (quantity) => {
    setReturnQuantity(quantity);
    setStep('confirmation');
  };

  const handleReturnConfirm = () => {
    console.log('Return confirmed:', returnQuantity, 'cups');
    setStep('complete');
    // Close modal after a short delay
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleReturnCancel = () => {
    setStep('quantity');
  };

  if (step === 'quantity') {
    return <ReturnQuantityView onClose={onClose} onConfirm={handleQuantityConfirm} />;
  }

  if (step === 'confirmation') {
    return (
      <ReturnConfirmationView
        quantity={returnQuantity}
        onClose={onClose}
        onCancel={handleReturnCancel}
        onConfirm={handleReturnConfirm}
      />
    );
  }

  if (step === 'complete') {
    return (
      <div className="return-complete-overlay">
        <div className="return-complete-container">
          <div className="return-complete-content">
            <div className="return-complete-title">반납이 완료되었습니다!</div>
            <div className="return-complete-subtitle">감사합니다</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="return-modal-overlay">
      <div className="return-modal-container">
        {/* Close Button */}
        <button onClick={onClose} className="return-modal-close-button">
          <svg className="return-modal-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2" strokeLinecap="round" />
            <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>

        {/* Toggle Tabs with Tooltip */}
        <div className="return-tabs-wrapper">
          {/* Tooltip */}
          <div className="return-tooltip-container">
            <div className="return-tooltip-wrapper">
              <div className="return-tooltip-bubble">보틀클럽 이용자세요?</div>
              <div className="return-tooltip-arrow" />
            </div>
          </div>

          {/* Toggle Tabs */}
          <div className="return-tabs-container">
            <button
              onClick={() => setActiveTab('phone')}
              className={`return-tab ${activeTab === 'phone' ? 'return-tab-active' : 'return-tab-inactive'}`}
            >
              <svg className="return-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={`return-tab return-tab-qr ${activeTab === 'qr' ? 'return-tab-active' : 'return-tab-inactive'}`}
            >
              <svg className="return-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="8" height="8" rx="1" strokeWidth="2" />
                <rect x="13" y="3" width="8" height="8" rx="1" strokeWidth="2" />
                <rect x="3" y="13" width="8" height="8" rx="1" strokeWidth="2" />
                <rect x="13" y="13" width="8" height="8" rx="1" strokeWidth="2" />
              </svg>
            </button>
          </div>
        </div>

        {activeTab === 'phone' ? (
          <ReturnPhoneViewWrapper onNext={() => setStep('quantity')} />
        ) : (
          <QRCodeView title="리턴미컵 반납을 위해" mode="return" />
        )}
      </div>
    </div>
  );
}

function ReturnPhoneViewWrapper({ onNext }) {
  const [phoneNumber, setPhoneNumber] = useState('010');

  const handleNumberClick = (num) => {
    if (phoneNumber.length < 11) {
      setPhoneNumber(phoneNumber + num);
    }
  };

  const handleDelete = () => {
    if (phoneNumber.length > 3) {
      setPhoneNumber(phoneNumber.slice(0, -1));
    }
  };

  const handleConfirm = () => {
    console.log('Return phone number:', phoneNumber);
    onNext();
  };

  return (
    <PhoneInputView
      phoneNumber={phoneNumber}
      onNumberClick={handleNumberClick}
      onDelete={handleDelete}
      onConfirm={handleConfirm}
      title="리턴미컵 반납을 위해"
    />
  );
}

