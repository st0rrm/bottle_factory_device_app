// Firebase 인증 관련 함수들
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut
} from 'firebase/auth';
import { auth } from './config';

/**
 * reCAPTCHA 초기화
 * @param {string} buttonId - reCAPTCHA를 적용할 버튼 ID
 */
export const initRecaptcha = (buttonId = 'recaptcha-container') => {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
      'size': 'invisible',
      'callback': (response) => {
        console.log('reCAPTCHA 검증 완료');
      },
      'expired-callback': () => {
        console.log('reCAPTCHA 만료됨');
      }
    });
  }
  return window.recaptchaVerifier;
};

/**
 * 전화번호로 SMS 인증번호 요청
 * @param {string} phoneNumber - 전화번호 (예: +821012345678)
 * @returns {Promise} confirmationResult
 */
export const sendVerificationCode = async (phoneNumber) => {
  try {
    // 전화번호 포맷 (+82로 시작)
    const formattedNumber = phoneNumber.startsWith('+82')
      ? phoneNumber
      : `+82${phoneNumber.startsWith('0') ? phoneNumber.slice(1) : phoneNumber}`;

    console.log('SMS 전송 중:', formattedNumber);

    // reCAPTCHA 초기화
    const appVerifier = initRecaptcha();

    // SMS 전송
    const confirmationResult = await signInWithPhoneNumber(
      auth,
      formattedNumber,
      appVerifier
    );

    console.log('SMS 전송 성공');
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
