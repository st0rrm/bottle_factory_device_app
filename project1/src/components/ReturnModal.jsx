import React, { useState } from 'react';
import PhoneInputView from './PhoneInputView';
import QRCodeView from './QRCodeView';
import ReturnQuantityView from './ReturnQuantityView';
import ReturnConfirmationView from './ReturnConfirmationView';
import phoneIcon from '../assets/images/phone_icon_identification.svg';
import phoneIconNot from '../assets/images/phone_icon_identification_not.svg';
import qrIcon from '../assets/images/qr_icon_identification.svg';
import qrIconActive from '../assets/images/qr_icon_identification_active.svg';
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
              <img src={activeTab === 'phone' ? phoneIcon : phoneIconNot} alt="Phone" className="return-tab-icon" />
            </button>
            <button
              onClick={() => setActiveTab('qr')}
              className={`return-tab return-tab-qr ${activeTab === 'qr' ? 'return-tab-active' : 'return-tab-inactive'}`}
            >
              <img src={activeTab === 'qr' ? qrIconActive : qrIcon} alt="QR" className="return-tab-icon" />
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

