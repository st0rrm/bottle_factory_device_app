import React, { useState, useEffect } from 'react';
import PhoneInputView from './PhoneInputView';
import QRCodeView from './QRCodeView';
import VerificationCodeView from './VerificationCodeView';
import ReturnQuantityView from './ReturnQuantityView';
import ReturnConfirmationView from './ReturnConfirmationView';
import { ReturnUnavailable } from './ReturnUnavailable';
import { ReturnImpossible } from './ReturnImpossible';
import phoneIcon from '../assets/images/phone_icon_identification.svg';
import phoneIconNot from '../assets/images/phone_icon_identification_not.svg';
import qrIcon from '../assets/images/qr_icon_identification.svg';
import qrIconActive from '../assets/images/qr_icon_identification_active.svg';
import './ReturnModal.css';
import xIcon from '../assets/images/x_icon.svg';
import { trackBehavior } from '../api/behaviors';
import { sendVerificationCode, verifyCode, clearRecaptcha } from '../firebase/auth';
import { getUserActiveRentals, processReturn } from '../firebase/firestore';
import { getDeviceShopIdAsync } from '../config/device';

export default function ReturnModal({ onClose, onOpenRental, onSuccess }) {
  const [activeTab, setActiveTab] = useState('phone');

  // 탭 전환 추적
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // 탭 클릭 이벤트 추적 (반납 모달)
    trackBehavior('tab_switch', `${tab}_return`);
  };

  const [phoneNumber, setPhoneNumber] = useState('010');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [showQuantitySelection, setShowQuantitySelection] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showNoRentalsType, setShowNoRentalsType] = useState(null); // 'impossible' or 'unavailable'
  const [currentUser, setCurrentUser] = useState(null);
  const [userRentals, setUserRentals] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [timer, setTimer] = useState(180);
  const [attempts, setAttempts] = useState(0);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showComplete, setShowComplete] = useState(false);
  const [returnScore, setReturnScore] = useState(0);
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

    // 모든 사용자에게 SMS 인증 진행 (보안을 위해)
    console.log('📱 SMS 인증번호 전송 중...');
    const result = await sendVerificationCode(phoneNumber, 'recaptcha-container-return');

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

    // 인증번호 확인
    const result = await verifyCode(confirmationResult, code);

    if (!result.success) {
      // 인증 실패
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
        // 1초 후 에러 상태 초기화하여 다시 입력 가능하게
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

    // Firebase Auth 인증으로 이미 사용자 확인 완료
    // result.user를 직접 사용 (전화번호가 일치하므로 본인 확인됨)
    const authenticatedUser = {
      uid: result.user.uid,
      phoneNumber: result.user.phoneNumber,
      mobile: phoneNumber
    };

    setCurrentUser(authenticatedUser);

    // Firebase에서 카페명으로 shopId 가져오기
    const shopInfo = await getDeviceShopIdAsync();
    if (!shopInfo.shopId) {
      setIsLoading(false);
      setErrorMessage('가게 정보를 찾을 수 없습니다. 다시 시도해주세요.');
      return;
    }

    const shopId = shopInfo.shopId;

    const rentalsResult = await getUserActiveRentals(authenticatedUser.uid, shopId);

    if (!rentalsResult.success || rentalsResult.rentals.length === 0) {
      // 반납할 컵이 없음 → ReturnUnavailable
      console.log('❌ 반납할 컵이 없습니다.');
      setIsLoading(false);
      setShowNoRentalsType('unavailable');
      return;
    }

    setUserRentals(rentalsResult.rentals);
    setQuantity(1); // 기본값 1개
    setIsLoading(false);
    setShowVerification(false);
    setShowQuantitySelection(true);
  };

  const handleQuantityConfirm = () => {
    setShowQuantitySelection(false);
    setShowConfirmation(true);
  };

  const handleConfirmCancel = () => {
    setShowConfirmation(false);
    setShowQuantitySelection(true);
  };

  const handleFinalConfirm = async () => {
    if (!currentUser || !userRentals || userRentals.length === 0) {
      console.error('❌ 사용자 또는 대여 기록 정보가 없습니다.');
      return;
    }

    // Firebase에서 카페명으로 shopId 가져오기
    const shopInfo = await getDeviceShopIdAsync();
    if (!shopInfo.shopId) {
      console.error('❌ Firebase에서 가게 정보를 찾을 수 없습니다.');
      setErrorMessage('가게 정보를 찾을 수 없습니다. 다시 시도해주세요.');
      return;
    }

    const shopId = shopInfo.shopId;
    const shopName = shopInfo.shopName || '카페명 없음';

    // 반납할 개수만큼 rentals 선택 (rented_date 순으로 정렬되어 있음)
    const selectedRentals = userRentals.slice(0, quantity);

    console.log('🔄 반납 처리 시작...', {
      userId: currentUser.uid,
      rentalCount: selectedRentals.length,
      shopId: shopId,
      shopName: shopName,
      quantity: quantity
    });

    setIsLoading(true);

    try {
      // Firebase에 반납 처리 (개수만큼 rentals 배열 전달)
      const result = await processReturn(currentUser.uid, selectedRentals, shopId, shopName);

      if (result.success) {
        console.log('✅ 반납 완료:', result.score, '점 적립, 컵', result.count, '개');
        setIsLoading(false);

        // 바로 모달 닫고 성공 스낵바 표시
        onSuccess?.(); // 성공 스낵바 표시
        onClose();
      } else {
        console.error('❌ 반납 실패:', result.error);
        setIsLoading(false);
        setErrorMessage('반납 처리에 실패했습니다: ' + result.error);
        setTimeout(() => {
          setErrorMessage('');
        }, 2000);
      }
    } catch (error) {
      console.error('❌ 반납 처리 중 예외 발생:', error);
      setIsLoading(false);
      setErrorMessage('반납 처리 중 오류가 발생했습니다.');
      setTimeout(() => {
        setErrorMessage('');
      }, 2000);
    }
  };

  // 반납 불가 화면 (미가입자)
  if (showNoRentalsType === 'impossible') {
    return (
      <div className="return-modal-overlay">
        <div className="return-modal-container">
          <button onClick={onClose} className="return-modal-close-button">
            <img src={xIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
          </button>

          <ReturnImpossible onClose={onClose} />
        </div>
      </div>
    );
  }

  // 반납할 컵 없음 화면
  if (showNoRentalsType === 'unavailable') {
    return (
      <div className="return-modal-overlay">
        <div className="return-modal-container">
          <button onClick={onClose} className="return-modal-close-button">
            <img src={xIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
          </button>

          <ReturnUnavailable
            onClose={onClose}
            onOpenRental={() => {
              onClose();
              if (onOpenRental) {
                onOpenRental();
              }
            }}
          />
        </div>
      </div>
    );
  }

  // 완료 화면
  if (showComplete) {
    return (
      <div className="return-complete-overlay">
        <div className="return-complete-container">
          <div className="return-complete-content">
            <div className="return-complete-title">반납이 완료되었습니다!</div>
            <div className="return-complete-subtitle">{returnScore}점이 적립되었습니다</div>
            <div className="return-complete-subtitle">감사합니다</div>
          </div>
        </div>
      </div>
    );
  }

  // 반납 확인 화면
  if (showConfirmation) {
    return (
      <ReturnConfirmationView
        quantity={quantity}
        onClose={onClose}
        onCancel={handleConfirmCancel}
        onConfirm={handleFinalConfirm}
        isLoading={isLoading}
      />
    );
  }

  // 반납할 개수 선택 화면
  if (showQuantitySelection) {
    return (
      <div className="return-modal-overlay">
        <div className="return-modal-container">
          <button onClick={onClose} className="return-modal-close-button">
            <img src={xIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
          </button>

          <ReturnQuantityView
            quantity={quantity}
            setQuantity={setQuantity}
            maxQuantity={userRentals.length}
            onConfirm={handleQuantityConfirm}
            onClose={onClose}
          />
        </div>
      </div>
    );
  }

  // 전화번호 입력 / 인증번호 입력 / QR 인증 화면
  return (
    <div className="return-modal-overlay">
      <div className="return-modal-container">
        {/* reCAPTCHA Container (invisible) */}
        <div id="recaptcha-container-return"></div>

        <button onClick={onClose} className="return-modal-close-button">
          <img src={xIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
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
                title="리턴미컵 반납을 위해"
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
          <QRCodeView title="리턴미컵 반납을 위해" mode="return" />
        )}
      </div>
    </div>
  );
}
