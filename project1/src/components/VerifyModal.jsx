import React, { useState, useEffect } from 'react';
import PhoneInputView from './PhoneInputView';
import QRCodeView from './QRCodeView';
import VerificationCodeView from './VerificationCodeView';
import QuantitySelectionView from './QuantitySelectionView';
import RentalConfirmationView from './RentalConfirmationView';
import './VerifyModal.css';
import xIcon from '../assets/images/x_icon.svg';

export default function VerifyModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('phone');
  const [phoneNumber, setPhoneNumber] = useState('010');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [showQuantitySelection, setShowQuantitySelection] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [availableVouchers] = useState(2);
  const [smsNotification, setSmsNotification] = useState(true);
  const [timer, setTimer] = useState(180);
  const [attempts, setAttempts] = useState(0);
  const [isError, setIsError] = useState(false);
  const CORRECT_CODE = '123456';
  const MAX_ATTEMPTS = 5;

  useEffect(() => {
    if (showVerification && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (showVerification && timer === 0) {
      // Timer expired, go back to phone input
      setTimeout(() => {
        setShowVerification(false);
        setPhoneNumber('010');
        setVerificationCode('');
        setTimer(180);
        setAttempts(0);
        setIsError(false);
      }, 500);
    }
  }, [showVerification, timer]);

  useEffect(() => {
    if (verificationCode.length === 6 && !isError) {
      const timeoutId = setTimeout(() => {
        if (verificationCode === CORRECT_CODE) {
          setShowQuantitySelection(true);
        } else {
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          setIsError(true);

          if (newAttempts >= MAX_ATTEMPTS) {
            setTimeout(() => {
              // Reset to phone input screen
              setShowVerification(false);
              setPhoneNumber('010');
              setVerificationCode('');
              setTimer(180);
              setAttempts(0);
              setIsError(false);
            }, 500);
          } else {
            setTimeout(() => {
              setVerificationCode('');
              setIsError(false);
            }, 1000);
          }
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [verificationCode]);

  const handleNumberClick = (num) => {
    if (showVerification) {
      if (verificationCode.length < 6 && !isError) {
        setVerificationCode(verificationCode + num);
      }
    } else {
      if (phoneNumber.length < 11) {
        setPhoneNumber(phoneNumber + num);
      }
    }
  };

  const handleDelete = () => {
    if (showVerification) {
      if (verificationCode.length > 0 && !isError) {
        setVerificationCode(verificationCode.slice(0, -1));
      }
    } else {
      if (phoneNumber.length > 3) {
        setPhoneNumber(phoneNumber.slice(0, -1));
      }
    }
  };

  const handleConfirm = () => {
    setShowVerification(true);
    setTimer(180);
  };

  const handleBackToPhone = () => {
    setShowVerification(false);
    setPhoneNumber('010');
    setVerificationCode('');
    setTimer(180);
    setAttempts(0);
    setIsError(false);
  };

  const handleIncrement = () => {
    if (quantity < availableVouchers) {
      setQuantity(quantity + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleQuantityConfirm = () => {
    setShowConfirmation(true);
  };

  const handleConfirmationCancel = () => {
    setShowConfirmation(false);
  };

  const handleFinalConfirm = () => {
    console.log('Rental confirmed:', { quantity, smsNotification });
    onClose();
  };

  return (
    <div className="verify-modal-overlay">
      <div className="verify-modal-container">
        {/* Close Button */}
        <button onClick={onClose} className="verify-close-button">
          <img src={xIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
        </button>

        {showConfirmation ? (
          <RentalConfirmationView
            quantity={quantity}
            smsNotification={smsNotification}
            onToggleSms={() => setSmsNotification(!smsNotification)}
            onCancel={handleConfirmationCancel}
            onConfirm={handleFinalConfirm}
          />
        ) : showQuantitySelection ? (
          <QuantitySelectionView
            quantity={quantity}
            availableVouchers={availableVouchers}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onConfirm={handleQuantityConfirm}
          />
        ) : (
          <>
            {/* Toggle Tabs with Tooltip */}
            <div className="verify-tabs-wrapper">
              {/* Tooltip */}
              <div className="verify-tooltip-container">
                <div className="verify-tooltip-wrapper">
                  <div className="verify-tooltip-bubble">보틀클럽 이용자세요?</div>
                  <div className="verify-tooltip-arrow" />
                </div>
              </div>

              {/* Toggle Tabs */}
              <div className="verify-tabs-container">
                <button
                  onClick={() => setActiveTab('phone')}
                  className={`verify-tab ${activeTab === 'phone' ? 'verify-tab-active' : 'verify-tab-inactive'}`}
                >
                  <svg className="verify-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveTab('qr')}
                  className={`verify-tab verify-tab-qr ${activeTab === 'qr' ? 'verify-tab-active' : 'verify-tab-inactive'}`}
                >
                  <svg className="verify-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <rect x="3" y="3" width="8" height="8" rx="1" strokeWidth="2" />
                    <rect x="13" y="3" width="8" height="8" rx="1" strokeWidth="2" />
                    <rect x="3" y="13" width="8" height="8" rx="1" strokeWidth="2" />
                    <rect x="13" y="13" width="8" height="8" rx="1" strokeWidth="2" />
                  </svg>
                </button>
              </div>
            </div>

            {activeTab === 'phone' ? (
              <>
                {!showVerification ? (
                  <PhoneInputView
                    phoneNumber={phoneNumber}
                    onNumberClick={handleNumberClick}
                    onDelete={handleDelete}
                    onConfirm={handleConfirm}
                  />
                ) : (
                  <VerificationCodeView
                    verificationCode={verificationCode}
                    isError={isError}
                    attempts={attempts}
                    maxAttempts={MAX_ATTEMPTS}
                    timer={timer}
                    onNumberClick={handleNumberClick}
                    onDelete={handleDelete}
                    onBackToPhone={handleBackToPhone}
                  />
                )}
              </>
            ) : (
              <QRCodeView />
            )}
          </>
        )}
      </div>
    </div>
  );
}
