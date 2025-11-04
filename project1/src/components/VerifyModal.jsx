import React, { useState, useEffect } from 'react';
import PhoneInputView from './PhoneInputView';
import QRCodeView from './QRCodeView';
import VerificationCodeView from './VerificationCodeView';
import QuantitySelectionView from './QuantitySelectionView';
import RentalConfirmationView from './RentalConfirmationView';
import { RentalUnavailable } from './RentalUnavailable';
import { RentalImpossible } from './RentalImpossible';
import phoneIcon from '../assets/images/phone_icon_identification.svg';
import phoneIconNot from '../assets/images/phone_icon_identification_not.svg';
import qrIcon from '../assets/images/qr_icon_identification.svg';
import qrIconActive from '../assets/images/qr_icon_identification_active.svg';
import './VerifyModal.css';
import xIcon from '../assets/images/x_icon.svg';
import { trackBehavior } from '../api/behaviors';
import { sendVerificationCode, verifyCode, clearRecaptcha } from '../firebase/auth';
import { createNewUser, getUserTickets, processRental, getUserByPhone } from '../firebase/firestore';

export default function VerifyModal({ onClose, onOpenReturn }) {
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
  const [showNoTicketsType, setShowNoTicketsType] = useState(null); // 'impossible' or 'unavailable'
  const [quantity, setQuantity] = useState(1);
  const [availableVouchers, setAvailableVouchers] = useState(0);
  const [userTickets, setUserTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [smsNotification, setSmsNotification] = useState(true);
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
    if (verificationCode.length === 6 && !isError && confirmationResult) {
      const timeoutId = setTimeout(async () => {
        setIsLoading(true);

        // Firebase 인증번호 확인
        const result = await verifyCode(confirmationResult, verificationCode);

        if (result.success) {
          console.log('인증 성공:', result.user.uid);
          setCurrentUser(result.user);

          // 신규 사용자인 경우 자동 회원가입
          if (result.isNewUser) {
            console.log('신규 사용자 - 자동 회원가입 진행');
            const createResult = await createNewUser(result.user);
            if (createResult.success) {
              console.log('회원가입 완료:', createResult.nickname);
            }
          }

          // 사용자 대여권 조회
          const ticketsResult = await getUserTickets(result.user.uid);
          if (ticketsResult.success) {
            let tickets = ticketsResult.tickets;
            const { totalCount, availableCount } = ticketsResult;

            // 개발 환경에서 대여권이 없으면 테스트용 대여권 추가
            if (tickets.length === 0 && import.meta.env.DEV) {
              console.log('⚠️ 대여권이 없습니다. 개발 모드: 테스트용 대여권 생성');
              tickets = [{
                id: 'test_voucher_dev',
                type: 'goods',
                name: '테스트 대여권 (개발 전용)',
                unlimited: false
              }];
            }

            setUserTickets(tickets);
            setAvailableVouchers(tickets.length);

            if (tickets.length > 0) {
              // 첫 번째 티켓을 기본 선택
              setSelectedTicket(tickets[0]);
              setShowQuantitySelection(true);
            } else {
              // 대여권이 없거나 모두 사용중인 경우
              if (totalCount === 0) {
                // 보유한 대여권이 아예 없음 → RentalImpossible
                console.log('❌ 보유한 대여권이 없습니다.');
                setShowNoTicketsType('impossible');
              } else {
                // 대여권은 있지만 모두 사용중 → RentalUnavailable
                console.log('❌ 사용 가능한 대여권이 없습니다. (모두 사용중)');
                setShowNoTicketsType('unavailable');
              }
            }
          }
        } else {
          // 인증 실패
          const newAttempts = attempts + 1;
          setAttempts(newAttempts);
          setIsError(true);
          setErrorMessage(result.error);

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
        }

        setIsLoading(false);
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [verificationCode]);

  // reCAPTCHA cleanup on unmount
  useEffect(() => {
    return () => {
      clearRecaptcha();
    };
  }, []);

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

  const handleConfirm = async () => {
    if (phoneNumber.length !== 11) {
      setErrorMessage('올바른 전화번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    // 모든 사용자에게 SMS 인증 진행 (보안을 위해)
    console.log('📱 SMS 인증번호 전송 중...');
    const result = await sendVerificationCode(phoneNumber);

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

  const handleFinalConfirm = async () => {
    if (!currentUser || !selectedTicket) {
      console.error('❌ 사용자 또는 티켓 정보가 없습니다.');
      return;
    }

    // 로그인한 카페 정보에서 shopId 가져오기
    const userData = localStorage.getItem('userData');
    if (!userData) {
      console.error('❌ 카페 정보를 찾을 수 없습니다.');
      setErrorMessage('카페 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
      return;
    }
    const cafeData = JSON.parse(userData);
    const shopId = cafeData.cafeId;
    const shopName = cafeData.cafeName || '카페명 없음';

    // 대여할 개수만큼 대여권 선택 (create 순으로 정렬되어 있음)
    const selectedTickets = userTickets.slice(0, quantity);

    console.log('🔄 대여 처리 시작...', {
      userId: currentUser.uid,
      ticketCount: selectedTickets.length,
      shopId: shopId,
      shopName: shopName,
      quantity: quantity
    });

    setIsLoading(true);

    try {
      // 테스트 전화번호이거나 테스트 대여권인 경우 바로 성공 처리
      if (phoneNumber === '01010000001' || selectedTickets[0]?.id.startsWith('test_voucher')) {
        console.log('✅ 테스트 모드 - 대여 처리 건너뛰기');
        setIsLoading(false);
        console.log('🏠 홈 화면으로 돌아갑니다...');
        onClose();
        return;
      }

      // Firebase에 대여 처리 (개수만큼 대여권 배열 전달)
      const result = await processRental(currentUser.uid, selectedTickets, shopId, shopName);

      if (result.success) {
        console.log(`✅ 대여 완료: ${result.count}개 대여권 사용, ${result.count}개 컵 대여`);
        setIsLoading(false);

        // 모달 닫기 (홈 화면으로 돌아가기)
        console.log('🏠 홈 화면으로 돌아갑니다...');
        onClose();
      } else {
        console.error('❌ 대여 실패:', result.error);
        setIsLoading(false);
        setErrorMessage('대여 처리에 실패했습니다: ' + result.error);
        setTimeout(() => {
          setErrorMessage('');
        }, 2000);
      }
    } catch (error) {
      console.error('❌ 대여 처리 중 예외 발생:', error);
      setIsLoading(false);
      setErrorMessage('대여 처리 중 오류가 발생했습니다.');
      setTimeout(() => {
        setErrorMessage('');
      }, 2000);
    }
  };

  // 대여권이 없는 경우 표시
  if (showNoTicketsType === 'impossible') {
    // 보유한 대여권이 아예 없음
    return (
      <div className="verify-modal-overlay">
        <div className="verify-modal-container">
          {/* Close Button */}
          <button onClick={onClose} className="verify-close-button">
            <img src={xIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
          </button>

          <RentalImpossible onClose={onClose} />
        </div>
      </div>
    );
  }

  if (showNoTicketsType === 'unavailable') {
    // 대여권은 있지만 모두 사용중
    return (
      <div className="verify-modal-overlay">
        <div className="verify-modal-container">
          {/* Close Button */}
          <button onClick={onClose} className="verify-close-button">
            <img src={xIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
          </button>

          <RentalUnavailable
            onCancel={onClose}
            onOpenReturn={() => {
              onClose();
              if (onOpenReturn) {
                onOpenReturn();
              }
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="verify-modal-overlay">
      <div className="verify-modal-container">
        {/* reCAPTCHA Container (invisible) */}
        <div id="recaptcha-container"></div>

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
