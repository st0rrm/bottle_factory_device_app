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
import xIcon from '../assets/images/x_icon.svg';

import './ReturnModal.css';

import { trackBehavior } from '../api/behaviors';
import { addTransaction } from '../api/statistics';
import { sendVerificationCode, verifyCode, clearRecaptcha } from '../firebase/auth';
import { getDeviceShopIdAsync } from '../config/device';
import { createNewUser } from '../firebase/firestore';

export default function DoModal({ onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('phone');

  // ✅ 행동별 점수 및 아이템 ID
  const ACTION_SCORES = {
    tumbler: 30,    // 텀블러: AESpVawGP202Tg4QOmvH
    container: 30,  // 다회용기: hjzsUXGds7dcqJyQYQzr
    refill: 30,     // 리필용기: r6V568cm0yGwDfQ8vooW
    recycle: 5,     // 자원순환: VjlasSJRJjC6cw8BItvS
  };

  const ACTION_ITEM_IDS = {
    tumbler: 'AESpVawGP202Tg4QOmvH',
    container: 'hjzsUXGds7dcqJyQYQzr',
    refill: 'r6V568cm0yGwDfQ8vooW',
    recycle: 'VjlasSJRJjC6cw8BItvS',
  };

  // 아이템 ID -> 액션 ID 매핑
  const ITEM_ID_TO_ACTION = {
    'AESpVawGP202Tg4QOmvH': 'tumbler',
    'hjzsUXGds7dcqJyQYQzr': 'container',
    'r6V568cm0yGwDfQ8vooW': 'refill',
    'VjlasSJRJjC6cw8BItvS': 'recycle',
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    trackBehavior('tab_switch', `${tab}_do`);
  };

  useEffect(() => {
    trackBehavior('modal_open', 'do');

    // 🔍 카페의 허용된 아이템 목록 가져오기
    const fetchAllowedItems = async () => {
      const shopInfo = await getDeviceShopIdAsync();
      if (shopInfo.shopData && shopInfo.shopData.items) {
        // Firebase의 item ID를 action ID로 변환
        const allowedActions = shopInfo.shopData.items
          .map(itemId => ITEM_ID_TO_ACTION[itemId])
          .filter(actionId => actionId); // undefined 제거

        console.log('✅ 카페 허용 아이템:', allowedActions);
        setAllowedActionIds(allowedActions);
      } else {
        // items 필드가 없으면 모든 아이템 허용
        console.log('⚠️ 카페에 items 필드가 없습니다. 모든 아이템 허용');
        setAllowedActionIds(['tumbler', 'container', 'refill', 'recycle']);
      }
    };

    fetchAllowedItems();
  }, []);

  const [phoneNumber, setPhoneNumber] = useState('010');
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [showActionSelection, setShowActionSelection] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // ✅ 선택된 행동들 (중복 허용)
  const [selectedActions, setSelectedActions] = useState([]);

  // ✅ 카페에서 허용된 아이템 ID 목록
  const [allowedActionIds, setAllowedActionIds] = useState(null);

  const [confirmationResult, setConfirmationResult] = useState(null);
  const [timer, setTimer] = useState(180);
  const [attempts, setAttempts] = useState(0);
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const MAX_ATTEMPTS = 5;
  const MAX_SELECTIONS = 5;

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
      setPhoneNumber((prev) => prev + num);
    }
  };

  const handleDelete = () => {
    if (phoneNumber.length > 3) {
      setPhoneNumber((prev) => prev.slice(0, -1));
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
      setVerificationCode((prev) => prev.slice(0, -1));
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

    // 신규/기존 사용자 확인 및 UID 전환
    const createResult = await createNewUser(result.user);
    let effectiveUser = result.user;

    if (createResult.existingUser) {
      console.log('⚠️ 기존 사용자 발견! UID 전환:');
      console.log('  Firebase Auth UID:', result.user.uid);
      console.log('  Firestore 기존 UID:', createResult.existingUser.uid);
      effectiveUser = {
        ...result.user,
        uid: createResult.existingUser.uid
      };
    } else if (createResult.isNew) {
      console.log('✅ 신규 사용자 생성 완료');
    } else if (createResult.success) {
      console.log('✅ 기존 사용자 확인 완료');
    }

    const authenticatedUser = {
      uid: effectiveUser.uid,
      phoneNumber: effectiveUser.phoneNumber,
      mobile: phoneNumber,
    };

    setCurrentUser(authenticatedUser);
    setIsLoading(false);
    setShowVerification(false);
    setShowActionSelection(true);
  };

  // ✅ 행동 클릭 시: 최대 5개까지, 중복 허용해서 뒤에 추가
  const handleToggleAction = (actionId) => {
    setSelectedActions((prev) => {
      if (prev.length >= MAX_SELECTIONS) return prev;
      return [...prev, actionId];
    });
  };

  // ✅ 아래 미니 아이콘 X 버튼 눌렀을 때: 해당 index 삭제
  const handleRemoveSelectedIndex = (indexToRemove) => {
    setSelectedActions((prev) => prev.filter((_, idx) => idx !== indexToRemove));
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

    // ✅ 선택된 행동들을 아이템별로 개수 집계
    const itemCounts = {};
    for (const actionId of selectedActions) {
      const itemId = ACTION_ITEM_IDS[actionId];
      if (itemId) {
        itemCounts[itemId] = (itemCounts[itemId] || 0) + 1;
      }
    }

    // ✅ 총 점수 계산
    const totalScore = selectedActions.reduce(
      (sum, actionId) => sum + (ACTION_SCORES[actionId] || 0),
      0
    );

    console.log('실천 적립 시작...', {
      userId: currentUser.uid,
      actions: selectedActions,
      items: itemCounts,
      shopId: shopId,
      shopName: shopName,
      totalScore,
    });

    setIsLoading(true);

    try {
      // ✅ 백엔드 API 호출하여 Firestore 업데이트
      const apiUrl = import.meta.env.VITE_API_BASE_URL || '/api';
      const response = await fetch(`${apiUrl}/users/do-actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: currentUser.uid,
          shopId: shopId,
          items: itemCounts
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('⚠️ 백엔드 API 호출 실패:', errorData);
        throw new Error(errorData.error || '실천 기록 실패');
      }

      const apiResult = await response.json();
      console.log('✅ Firestore 업데이트 완료:', apiResult);

      // ✅ PostgreSQL에 기록 (통계용)
      try {
        await addTransaction('do', phoneNumber, selectedActions.length, totalScore);
        console.log(`✅ 실천 기록 완료: ${selectedActions.length}개 행동, 총 ${totalScore}점`);
      } catch (error) {
        console.error('⚠️ PostgreSQL 기록 실패:', error);
      }

      setIsLoading(false);
      onSuccess?.(totalScore);
      onClose();
    } catch (error) {
      console.error('실천 기록 실패:', error);
      setIsLoading(false);
      setErrorMessage(error.message || '실천 기록에 실패했습니다.');
      setTimeout(() => {
        setErrorMessage('');
      }, 2000);
    }
  };

  // 확인 화면
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

  // 행동 선택 화면
  if (showActionSelection) {
    return (
      <div className="return-modal-overlay">
        <div className="return-modal-container">
          <button onClick={onClose} className="return-modal-close-button">
            <img src={xIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
          </button>

          <DoActionSelectionView
            selectedActions={selectedActions}
            onToggleAction={handleToggleAction}
            onRemoveSelectedIndex={handleRemoveSelectedIndex}
            onConfirm={handleActionConfirm}
            allowedActionIds={allowedActionIds}
          />
        </div>
      </div>
    );
  }

  // 기본(휴대폰 / QR) 화면
  return (
    <div className="return-modal-overlay">
      <div className="return-modal-container">
        {/* reCAPTCHA Container (invisible) */}
        <div id="recaptcha-container-do"></div>

        <button onClick={onClose} className="return-modal-close-button">
          <img src={xIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
        </button>

        {/* Tabs + Tooltip */}
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
              className={`return-tab ${
                activeTab === 'phone' ? 'return-tab-active' : 'return-tab-inactive'
              }`}
            >
              <img
                src={activeTab === 'phone' ? phoneIcon : phoneIconNot}
                alt="Phone"
                className="return-tab-icon"
              />
            </button>
            <button
              onClick={() => handleTabChange('qr')}
              className={`return-tab return-tab-qr ${
                activeTab === 'qr' ? 'return-tab-active' : 'return-tab-inactive'
              }`}
            >
              <img
                src={activeTab === 'qr' ? qrIconActive : qrIcon}
                alt="QR"
                className="return-tab-icon"
              />
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
