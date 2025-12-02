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
import { addTransaction } from '../api/statistics';
import { sendVerificationCode, verifyCode, clearRecaptcha } from '../firebase/auth';
import { createNewUser, getUserTickets, processRental, getUserByPhone } from '../firebase/firestore';
import { getDeviceShopIdAsync } from '../config/device';

export default function VerifyModal({ onClose, onOpenReturn, onSuccess }) {
  const [activeTab, setActiveTab] = useState('phone');

  // 탭 전환 추적
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // 탭 클릭 이벤트 추적 (대여 모달)
    trackBehavior('tab_switch', `${tab}_borrow`);
  };

  // 모달 열림 추적 (컴포넌트 마운트 시 1회만)
  useEffect(() => {
    trackBehavior('modal_open', 'borrow');

    // 리턴미컵 메뉴 진입 통계 기록
    const logMenuEntry = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        await fetch(`${apiBaseUrl}/voice/log-stat`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            statType: 'returnmecup_menu_entered',
            metadata: { menu: 'borrow' }
          })
        });
      } catch (error) {
        console.error('통계 기록 실패:', error);
      }
    };

    logMenuEntry();
  }, []);
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
          console.log('✅ 인증 성공:', result.user.uid);
          console.log('📊 신규 사용자 여부:', result.isNewUser);

          // ✨ 신규 사용자인 경우에만 Firestore 문서 생성
          if (result.isNewUser) {
            console.log('🆕 신규 사용자 - Firestore 문서 생성 중...');
            const createResult = await createNewUser(result.user);

            if (!createResult.success) {
              console.error('❌ 사용자 생성 실패:', createResult.error);
              setErrorMessage('사용자 정보 생성에 실패했습니다.');
              setIsError(true);
              setIsLoading(false);
              return;
            }

            console.log('✅ 신규 사용자 생성 완료:', createResult.nickname);
          } else {
            console.log('👤 기존 사용자 - SMS 인증 완료');
          }

          const effectiveUser = {
            ...result.user,
            isNewUser: result.isNewUser
          };
          setCurrentUser(effectiveUser);

          // 사용자 대여권 조회 (effectiveUser UID 사용)
          const ticketsResult = await getUserTickets(effectiveUser.uid);
          if (ticketsResult.success) {
            const tickets = ticketsResult.tickets;
            const { totalCount, availableCount } = ticketsResult;

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

    // 인증 시도 추적
    trackBehavior('verification_attempt', `phone_borrow_${phoneNumber.slice(-4)}`);

    // ✨ 1단계: 전화번호로 기존 사용자 확인 (SMS 인증 전)
    console.log('🔍 전화번호로 기존 사용자 확인 중:', phoneNumber);
    const existingUserResult = await getUserByPhone(phoneNumber);

    if (existingUserResult.success) {
      // ✅ 기존 사용자 발견! SMS 인증 건너뛰고 바로 대여권 조회
      console.log('✅ 기존 사용자 확인 완료! SMS 인증 건너뜀');
      console.log('   UID:', existingUserResult.user.uid);
      console.log('   이름:', existingUserResult.user.name);

      const effectiveUser = {
        uid: existingUserResult.user.uid,
        phoneNumber: existingUserResult.user.mobile,
        isNewUser: false
      };
      setCurrentUser(effectiveUser);

      // 대여권 조회
      const ticketsResult = await getUserTickets(effectiveUser.uid);
      if (ticketsResult.success) {
        const tickets = ticketsResult.tickets;
        const { totalCount } = ticketsResult;

        setUserTickets(tickets);
        setAvailableVouchers(tickets.length);

        if (tickets.length > 0) {
          setSelectedTicket(tickets[0]);
          setShowQuantitySelection(true);
        } else {
          if (totalCount === 0) {
            console.log('❌ 보유한 대여권이 없습니다.');
            setShowNoTicketsType('impossible');
          } else {
            console.log('❌ 사용 가능한 대여권이 없습니다.');
            setShowNoTicketsType('unavailable');
          }
        }
      }

      setIsLoading(false);
      return;
    }

    // ✨ 2단계: 신규 사용자 → SMS 인증 진행
    console.log('📱 신규 사용자입니다. SMS 인증번호 전송 중...');
    const result = await sendVerificationCode(phoneNumber, 'recaptcha-container-verify');

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

    // Firebase에서 카페명으로 shopId 가져오기
    const shopInfo = await getDeviceShopIdAsync();
    if (!shopInfo.shopId) {
      console.error('❌ Firebase에서 가게 정보를 찾을 수 없습니다.');
      setErrorMessage('가게 정보를 찾을 수 없습니다. 다시 시도해주세요.');
      return;
    }

    const shopId = shopInfo.shopId;
    const shopName = shopInfo.shopName || '카페명 없음';

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

        // PostgreSQL 거래 기록은 백엔드 /api/users/borrow에서 자동으로 처리됨 (테스트 모드는 제외)

        setIsLoading(false);
        console.log('🏠 홈 화면으로 돌아갑니다...');
        onSuccess?.(); // 성공 스낵바 표시
        onClose();
        return;
      }

      // Firebase에 대여 처리 (개수만큼 대여권 배열 전달)
      const result = await processRental(currentUser.uid, selectedTickets, shopId, shopName, currentUser.isNewUser);

      if (result.success) {
        console.log(`✅ 대여 완료: ${result.count}개 대여권 사용, ${result.count}개 컵 대여`);

        // PostgreSQL 거래 기록은 백엔드(users.js)에서 자동으로 처리됨 (30점)
        // 프론트엔드에서 중복 호출하지 않음

        setIsLoading(false);

        // 모달 닫기 (홈 화면으로 돌아가기)
        console.log('🏠 홈 화면으로 돌아갑니다...');
        onSuccess?.(); // 성공 스낵바 표시
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
        <div id="recaptcha-container-verify"></div>

        {/* Close Button */}
        <button onClick={onClose} className="verify-close-button">
          <img src={xIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
        </button>

        {showConfirmation ? (
          <RentalConfirmationView
            quantity={quantity}
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
