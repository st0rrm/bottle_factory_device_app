import React, { useState, useEffect } from 'react';
import PhoneInputView from './PhoneInputView';
import QRCodeView from './QRCodeView';
import VerificationCodeView from './VerificationCodeView';
import QuantitySelectionView from './QuantitySelectionView';
import RentalConfirmationView from './RentalConfirmationView';
import phoneIcon from '../assets/images/phone_icon_identification.svg';
import phoneIconNot from '../assets/images/phone_icon_identification_not.svg';
import qrIcon from '../assets/images/qr_icon_identification.svg';
import qrIconActive from '../assets/images/qr_icon_identification_active.svg';
import './VerifyModal.css';
import xIcon from '../assets/images/x_icon.svg';
import { trackBehavior } from '../api/behaviors';

export default function VerifyModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('phone');

  // 탭 전환 추적
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // 탭 클릭 이벤트 추적 (대여 모달)
    trackBehavior('tab_switch', `${tab}_borrow`);
  };
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
                  onClick={() => handleTabChange('phone')}
                  className={`verify-tab ${activeTab === 'phone' ? 'verify-tab-active' : 'verify-tab-inactive'}`}
                >
                  <img src={activeTab === 'phone' ? phoneIcon : phoneIconNot} alt="Phone" className="verify-tab-icon" />
                </button>
                <button
                  onClick={() => handleTabChange('qr')}
                  className={`verify-tab verify-tab-qr ${activeTab === 'qr' ? 'verify-tab-active' : 'verify-tab-inactive'}`}
                >
                  <img src={activeTab === 'qr' ? qrIconActive : qrIcon} alt="QR" className="verify-tab-icon" />
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
