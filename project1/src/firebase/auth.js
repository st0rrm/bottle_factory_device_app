// Firebase 인증 관련 함수들
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut
} from 'firebase/auth';
import { auth } from './config';

/**
 * reCAPTCHA 정리
 */
export const clearRecaptcha = () => {
  if (window.recaptchaVerifier) {
    try {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
      window.recaptchaWidgetId = undefined;
      window.recaptchaButtonId = undefined;
      console.log('✅ reCAPTCHA 정리 완료');
    } catch (error) {
      console.error('❌ reCAPTCHA 정리 실패:', error);
      // 에러가 발생해도 강제로 null 설정
      window.recaptchaVerifier = null;
      window.recaptchaWidgetId = undefined;
      window.recaptchaButtonId = undefined;
    }
  }

  // DOM에서 grecaptcha 위젯 제거 (안전한 정리)
  try {
    const containers = [
      'recaptcha-container-verify',
      'recaptcha-container-return',
      'recaptcha-container-do'
    ];

    containers.forEach(containerId => {
      const container = document.getElementById(containerId);
      if (container) {
        // grecaptcha iframe 및 관련 요소만 제거 (컨테이너는 유지)
        const iframes = container.getElementsByTagName('iframe');
        const divs = container.getElementsByTagName('div');

        // iframe 제거
        while (iframes.length > 0) {
          iframes[0].remove();
        }

        // grecaptcha 관련 div만 제거
        Array.from(divs).forEach(div => {
          if (div.id && div.id.includes('recaptcha')) {
            div.remove();
          }
        });
      }
    });
  } catch (error) {
    console.error('❌ reCAPTCHA DOM 정리 실패:', error);
  }
};

/**
 * reCAPTCHA 초기화
 * @param {string} buttonId - reCAPTCHA를 적용할 버튼 ID
 */
export const initRecaptcha = (buttonId = 'recaptcha-container') => {
  // 이미 동일한 buttonId로 초기화된 verifier가 있으면 재사용
  if (window.recaptchaVerifier &&
      window.recaptchaButtonId === buttonId &&
      window.recaptchaWidgetId !== undefined) {
    console.log('✅ 기존 reCAPTCHA 재사용 (buttonId:', buttonId + ')');
    return window.recaptchaVerifier;
  }

  // 다른 buttonId의 verifier가 있으면 정리
  if (window.recaptchaVerifier && window.recaptchaButtonId !== buttonId) {
    console.log('🔄 다른 컨테이너의 reCAPTCHA 정리 (이전:', window.recaptchaButtonId, '→ 새:', buttonId + ')');
    clearRecaptcha();
  }

  try {
    // 새로운 verifier 생성
    window.recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
      'size': 'invisible',
      'badge': 'bottomright',  // 배지 위치 명시
      'hl': 'ko',  // 한국어 명시 (신뢰도 향상)
      'callback': (response) => {
        console.log('✅ reCAPTCHA 검증 완료');
      },
      'expired-callback': () => {
        console.log('⚠️ reCAPTCHA 만료됨 - 재초기화 필요');
        clearRecaptcha();
      }
    });

    // buttonId 저장 (재사용 판단용)
    window.recaptchaButtonId = buttonId;
    console.log('✅ reCAPTCHA 초기화 성공:', buttonId);
    return window.recaptchaVerifier;
  } catch (error) {
    console.error('❌ reCAPTCHA 초기화 실패:', error);
    // 에러 발생 시 DOM 정리 후 재시도
    clearRecaptcha();

    // 재시도
    window.recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
      'size': 'invisible',
      'badge': 'bottomright',
      'hl': 'ko',
      'callback': (response) => {
        console.log('✅ reCAPTCHA 검증 완료 (재시도)');
      },
      'expired-callback': () => {
        console.log('⚠️ reCAPTCHA 만료됨');
        clearRecaptcha();
      }
    });

    // buttonId 저장 (재시도 성공 시)
    window.recaptchaButtonId = buttonId;
    return window.recaptchaVerifier;
  }
};

/**
 * 전화번호로 SMS 인증번호 요청
 * @param {string} phoneNumber - 전화번호 (예: +821012345678)
 * @param {string} containerId - reCAPTCHA 컨테이너 ID (기본값: 'recaptcha-container-verify')
 * @returns {Promise} confirmationResult
 */
export const sendVerificationCode = async (phoneNumber, containerId = 'recaptcha-container-verify') => {
  try {
    // 전화번호 포맷 (+82로 시작)
    const formattedNumber = phoneNumber.startsWith('+82')
      ? phoneNumber
      : `+82${phoneNumber.startsWith('0') ? phoneNumber.slice(1) : phoneNumber}`;

    console.log('📱 SMS 전송 시작:', formattedNumber);
    console.log('🔐 reCAPTCHA 컨테이너:', containerId);

    // reCAPTCHA 초기화
    let appVerifier;
    try {
      appVerifier = initRecaptcha(containerId);
      console.log('✅ reCAPTCHA 준비 완료');
    } catch (recaptchaError) {
      console.error('❌ reCAPTCHA 초기화 실패:', recaptchaError);
      throw new Error('reCAPTCHA 초기화 실패. 페이지를 새로고침해주세요.');
    }

    // SMS 전송
    console.log('📤 Firebase SMS 요청 중...');
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      formattedNumber,
      appVerifier
    );

    console.log('✅ SMS 전송 성공');
    return { success: true, confirmationResult };

  } catch (error) {
    console.error('SMS 전송 실패:', error);

    // 에러 메시지 한글화
    let errorMessage = '인증번호 전송에 실패했습니다.';

    switch (error.code) {
      case 'auth/invalid-phone-number':
        errorMessage = '유효하지 않은 전화번호 형식입니다.';
        break;
      case 'auth/too-many-requests':
        errorMessage = '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.';
        break;
      case 'auth/quota-exceeded':
        errorMessage = 'SMS 할당량을 초과했습니다.';
        break;
      default:
        errorMessage = error.message;
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * 인증번호 확인
 * @param {object} confirmationResult - sendVerificationCode에서 반환된 객체
 * @param {string} code - 6자리 인증번호
 * @returns {Promise} userCredential
 */
export const verifyCode = async (confirmationResult, code) => {
  try {
    console.log('인증번호 확인 중:', code);

    const result = await confirmationResult.confirm(code);

    console.log('인증 성공:', result.user.uid);

    return {
      success: true,
      user: result.user,
      isNewUser: result.additionalUserInfo?.isNewUser || false
    };

  } catch (error) {
    console.error('인증 실패:', error);

    let errorMessage = '인증번호 확인에 실패했습니다.';

    switch (error.code) {
      case 'auth/invalid-verification-code':
        errorMessage = '잘못된 인증번호입니다.';
        break;
      case 'auth/code-expired':
        errorMessage = '인증번호가 만료되었습니다. 다시 요청해주세요.';
        break;
      default:
        errorMessage = error.message;
    }

    return { success: false, error: errorMessage };
  }
};

/**
 * 로그아웃
 */
export const firebaseSignOut = async () => {
  try {
    await signOut(auth);
    console.log('로그아웃 성공');
    return { success: true };
  } catch (error) {
    console.error('로그아웃 실패:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 현재 로그인된 사용자 가져오기
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};
