import React, { useState, useEffect } from 'react';
import PhoneInputView from './PhoneInputView';
import QRCodeView from './QRCodeView';
import VerificationCodeView from './VerificationCodeView';
import DoActionSelectionView from './DoActionSelectionView';
import DoConfirmationView from './DoConfirmationView';
import phoneIcon from '../assets/images/phone_icon_identification.svg';
import phoneIconNot from '../assets/images/phone_icon_identification_not.svg';
import qrIcon from '../assets/images/qr_icon_identification.svg';
import qrIconActive from '../assets/images/qr_icon_identification_active.svg';
import './ReturnModal.css';
import xIcon from '../assets/images/x_icon.svg';
import { trackBehavior } from '../api/behaviors';
import { addTransaction } from '../api/statistics';
import { sendVerificationCode, verifyCode, clearRecaptcha } from '../firebase/auth';
import { getDeviceShopIdAsync } from '../config/device';

export default function DoModal({ onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('phone');

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    trackBehavior('tab_switch', `${tab}_do`);
  };

  useEffect(() => {
    trackBehavior('modal_open', 'do');
  }, []);

  const [phoneNumber, setPhoneNumber] = useState('010');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [showActionSelection, setShowActionSelection] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedActions, setSelectedActions] = useState([]);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [timer, setTimer] = useState(180);
  const [attempts, setAttempts] = useState(0);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const MAX_ATTEMPTS = 5;

  useEffect(() => {
    if (showVerification && timer > 0) {
      const interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(interval);
    } else if (timer === 0) {
      setIsError(true);
      setErrorMessage('인증 시간이 만료되었습니다. 다시 시도해주세요.');
    }
  }, [showVerification, timer]);

  useEffect(() => {
    return () => {
      clearRecaptcha();
    };
  }, []);

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

  const handlePhoneConfirm = async () => {
    if (phoneNumber.length !== 11) {
      setErrorMessage('올바른 전화번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    trackBehavior('verification_attempt', `phone_do_${phoneNumber.slice(-4)}`);

    console.log('📱 SMS 인증번호 전송 중...');
    const result = await sendVerificationCode(phoneNumber, 'recaptcha-container-do');

    if (result.success) {
      console.log('✅ SMS 전송 성공');
      setConfirmationResult(result.confirmationResult);
      setShowVerification(true);
      setTimer(180);
    } else {
      console.error('❌ SMS 전송 실패:', result.error);
      setErrorMessage(result.error);
      setIsError(true);
      setTimeout(() => {
        setIsError(false);
        setErrorMessage('');
      }, 2000);
    }

    setIsLoading(false);
  };

  const handleCodeNumberClick = (num) => {
    if (verificationCode.length < 6 && !isError) {
      const newCode = verificationCode + num;
      setVerificationCode(newCode);

      if (newCode.length === 6) {
        handleCodeComplete(newCode);
      }
    }
  };

  const handleCodeDelete = () => {
    if (verificationCode.length > 0 && !isError) {
      setVerificationCode(verificationCode.slice(0, -1));
    }
  };

  const handleBackToPhone = () => {
    setShowVerification(false);
    setVerificationCode('');
    setTimer(180);
    setAttempts(0);
    setIsError(false);
    setErrorMessage('');
  };

  const handleCodeComplete = async (code) => {
    if (attempts >= MAX_ATTEMPTS) {
      setIsError(true);
      setErrorMessage('인증 시도 횟수를 초과했습니다. 처음부터 다시 시도해주세요.');
      return;
    }

    setIsLoading(true);
    console.log('🔐 인증번호 확인 중...');

    const result = await verifyCode(confirmationResult, code);

    if (!result.success) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setIsError(true);
      setErrorMessage(`인증번호가 올바르지 않습니다. (${newAttempts}/${MAX_ATTEMPTS})`);
      setVerificationCode('');
      setIsLoading(false);

      if (newAttempts >= MAX_ATTEMPTS) {
        setTimeout(() => {
          handleBackToPhone();
        }, 500);
      } else {
        setTimeout(() => {
          setVerificationCode('');
          setIsError(false);
          setErrorMessage('');
        }, 1000);
      }
      return;
    }

    // 인증 성공
    console.log('✅ 인증 성공:', result.user.uid);

    const authenticatedUser = {
      uid: result.user.uid,
      phoneNumber: result.user.phoneNumber,
      mobile: phoneNumber
    };

    setCurrentUser(authenticatedUser);
    setIsLoading(false);
    setShowVerification(false);
    setShowActionSelection(true);
  };

  const handleToggleAction = (actionId) => {
    setSelectedActions((prev) => {
      if (prev.includes(actionId)) {
        return prev.filter((id) => id !== actionId);
      } else {
        return [...prev, actionId];
      }
    });
  };

  const handleActionConfirm = () => {
    if (selectedActions.length === 0) {
      return;
    }
    setShowActionSelection(false);
    setShowConfirmation(true);
  };

  const handleConfirmCancel = () => {
    setShowConfirmation(false);
    setShowActionSelection(true);
  };

  const handleFinalConfirm = async () => {
    if (!currentUser || selectedActions.length === 0) {
      console.error('❌ 사용자 또는 실천 선택 정보가 없습니다.');
      return;
    }

    const shopInfo = await getDeviceShopIdAsync();
    if (!shopInfo.shopId) {
      console.error('❌ Firebase에서 가게 정보를 찾을 수 없습니다.');
      setErrorMessage('가게 정보를 찾을 수 없습니다. 다시 시도해주세요.');
      return;
    }

    const shopId = shopInfo.shopId;
    const shopName = shopInfo.shopName || '카페명 없음';

    console.log('실천 적립 시작...', {
      userId: currentUser.uid,
      actions: selectedActions,
      shopId: shopId,
      shopName: shopName,
    });

    setIsLoading(true);

    try {
      const totalScore = selectedActions.length * 10;

      // PostgreSQL 기록 추가
      try {
        await addTransaction('do', phoneNumber, selectedActions.length);
        console.log(`실천 기록 완료: ${selectedActions.length}개 행동 실천`);
      } catch (error) {
        console.error('기록 실패', error);
      }

      setIsLoading(false);

      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('실천 기록 실패', error);
      setIsLoading(false);
      setErrorMessage('실천 기록에 실패했습니다.');
      setTimeout(() => {
        setErrorMessage('');
      }, 2000);
    }
  };

  // Ux Tt
  if (showConfirmation) {
    return (
      <DoConfirmationView
        selectedActions={selectedActions}
        onClose={onClose}
        onCancel={handleConfirmCancel}
        onConfirm={handleFinalConfirm}
        isLoading={isLoading}
      />
    );
  }

  // ��  � Tt
  if (showActionSelection) {
    return (
      <div className="return-modal-overlay">
        <div className="return-modal-container">
          <button onClick={onClose} className="return-modal-close-button">
            <img src={xIcon} alt="�0" style={{ width: '24px', height: '24px' }} />
          </button>

          <DoActionSelectionView
            selectedActions={selectedActions}
            onToggleAction={handleToggleAction}
            onConfirm={handleActionConfirm}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="return-modal-overlay">
      <div className="return-modal-container">
        {/* reCAPTCHA Container (invisible) */}
        <div id="recaptcha-container-do"></div>

        <button onClick={onClose} className="return-modal-close-button">
          <img src={xIcon} alt="�0" style={{ width: '24px', height: '24px' }} />
        </button>

        {/* Toggle Tabs with Tooltip */}
        <div className="return-tabs-wrapper">
          <div className="return-tooltip-container">
            <div className="return-tooltip-wrapper">
              <div className="return-tooltip-bubble">보틀클럽 이용자세요?</div>
              <div className="return-tooltip-arrow" />
            </div>
          </div>

          <div className="return-tabs-container">
            <button
              onClick={() => handleTabChange('phone')}
              className={`return-tab ${activeTab === 'phone' ? 'return-tab-active' : 'return-tab-inactive'}`}
            >
              <img src={activeTab === 'phone' ? phoneIcon : phoneIconNot} alt="Phone" className="return-tab-icon" />
            </button>
            <button
              onClick={() => handleTabChange('qr')}
              className={`return-tab return-tab-qr ${activeTab === 'qr' ? 'return-tab-active' : 'return-tab-inactive'}`}
            >
              <img src={activeTab === 'qr' ? qrIconActive : qrIcon} alt="QR" className="return-tab-icon" />
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
                onConfirm={handlePhoneConfirm}
                title="제로웨이스트 실천 기록을 위해"
              />
            ) : (
              <VerificationCodeView
                verificationCode={verificationCode}
                onNumberClick={handleCodeNumberClick}
                onDelete={handleCodeDelete}
                onBackToPhone={handleBackToPhone}
                timer={timer}
                isError={isError}
                attempts={attempts}
                maxAttempts={MAX_ATTEMPTS}
              />
            )}
          </>
        ) : (
          <QRCodeView title="제로웨이스트 실천 기록을 위해" mode="do" />
        )}
      </div>
    </div>
  );
}
