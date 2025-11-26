// Firestore 데이터베이스 관련 함수들
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from './config';

/**
 * 카카오 주소 API로 주소 데이터 가져오기
 * @param {string} addressQuery - 검색할 주소 (예: "서울 서대문구 연희동")
 * @returns {Promise<object|null>} 주소 데이터 또는 null
 */
const fetchAddressFromKakao = async (addressQuery) => {
  try {
    const apiKey = import.meta.env.VITE_KAKAO_API_KEY;
    const apiUrl = import.meta.env.VITE_KAKAO_ADDRESS_URL;

    if (!apiKey || !apiUrl) {
      console.warn('⚠️ 카카오 API 설정이 없습니다. 기본값을 사용합니다.');
      return null;
    }

    const url = `${apiUrl}?query=${encodeURIComponent(addressQuery)}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `KakaoAK ${apiKey}`
      }
    });

    if (!response.ok) {
      console.error('❌ 카카오 API 요청 실패:', response.status);
      return null;
    }

    const data = await response.json();

    if (!data.documents || data.documents.length === 0) {
      console.warn('⚠️ 주소 검색 결과가 없습니다:', addressQuery);
      return null;
    }

    // 첫 번째 결과 반환 (가장 관련성이 높은 결과)
    const addressData = data.documents[0];

    // address_type에 따라 주소 정보 선택
    const selectedAddress = addressData.address_type === 'ROAD'
      ? addressData.road_address
      : addressData.address;

    // h_code 또는 b_code 추출
    const code = selectedAddress?.h_code || selectedAddress?.b_code;

    return {
      address: {
        address_name: selectedAddress.address_name,
        b_code: selectedAddress.b_code || "",
        h_code: selectedAddress.h_code || "",
        main_address_no: selectedAddress.main_address_no || "",
        mountain_yn: selectedAddress.mountain_yn || "N",
        region_1depth_name: selectedAddress.region_1depth_name,
        region_2depth_name: selectedAddress.region_2depth_name,
        region_3depth_name: selectedAddress.region_3depth_name || selectedAddress.region_3depth_h_name,
        sub_address_no: selectedAddress.sub_address_no || "",
        x: addressData.x,
        y: addressData.y
      },
      address_name: addressData.address_name,
      address_type: addressData.address_type,
      road_address: addressData.road_address || null,
      x: addressData.x,
      y: addressData.y,
      adm_cd2: code || "",
      sido: code ? code.substring(0, 2) : "",
      sgg: code ? code.substring(0, 5) : "",
      dp_nm: selectedAddress.region_3depth_name || selectedAddress.region_3depth_h_name || "",
      adm_nm: selectedAddress.address_name || ""
    };

  } catch (error) {
    console.error('❌ 카카오 주소 API 호출 실패:', error);
    return null;
  }
};

/**
 * 신규 사용자 자동 생성
 * @param {object} user - Firebase Auth User 객체
 * @returns {Promise}
 */
export const createNewUser = async (user) => {
  try {
    console.log('🔍 사용자 확인 시작:', user.uid);
    const userRef = doc(db, 'users', user.uid);

    // 이미 문서가 있는지 확인 (UID 기반)
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      console.log('✅ 기존 사용자 확인 완료 (UID 일치)');
      return { success: true, isNew: false };
    }

    // 전화번호 포맷 변환 (+821012345678 → 01012345678)
    let phoneNumber = user.phoneNumber;
    if (phoneNumber.startsWith('+82')) {
      phoneNumber = '0' + phoneNumber.slice(3);
    }

    // 전화번호로 기존 사용자 확인
    console.log('📱 전화번호로 기존 사용자 확인 중:', phoneNumber);
    const existingUserResult = await getUserByPhone(phoneNumber);
    if (existingUserResult.success) {
      console.log('✅ 해당 전화번호로 등록된 사용자가 이미 존재합니다.');
      console.log('   기존 UID:', existingUserResult.user.uid);
      console.log('   새 UID:', user.uid);
      console.log('⚠️  Firebase 프로젝트가 다르면 UID가 다를 수 있습니다.');
      return {
        success: true,
        isNew: false,
        message: '이미 등록된 전화번호입니다.',
        existingUser: existingUserResult.user
      };
    }

    console.log('📝 새 사용자 문서 생성 중...');

    // 닉네임 생성 (휴대폰 뒤 8자리)
    // 예: 01012345678 → 12345678
    const nickname = phoneNumber.slice(-8);

    console.log('📱 전화번호:', phoneNumber);
    console.log('👤 닉네임:', nickname);

    // 기본 거주지 설정 (연희동) - 카카오 API로 실제 데이터 가져오기
    console.log('🗺️ 카카오 API로 연희동 주소 데이터 가져오는 중...');
    const kakaoAddressData = await fetchAddressFromKakao("서울 서대문구 연희동");

    // 카카오 API 실패 시 fallback 기본값
    const defaultAddress = kakaoAddressData ? {
      address: kakaoAddressData.address,
      address_name: kakaoAddressData.address_name,
      address_type: kakaoAddressData.address_type,
      road_address: kakaoAddressData.road_address,
      x: kakaoAddressData.x,
      y: kakaoAddressData.y
    } : {
      address: {
        address_name: "서울 서대문구 연희동",
        b_code: "1141011700",
        h_code: "1141061500",
        main_address_no: "",
        mountain_yn: "N",
        region_1depth_name: "서울",
        region_2depth_name: "서대문구",
        region_3depth_h_name: "연희동",
        region_3depth_name: "연희동",
        sub_address_no: "",
        x: "126.935230751932",
        y: "37.5739100104158"
      },
      address_name: "서울 서대문구 연희동",
      address_type: "REGION",
      road_address: null,
      x: "126.935230751932",
      y: "37.5739100104158"
    };

    const adm_cd2 = kakaoAddressData?.adm_cd2 || "1141011700";
    const sido = kakaoAddressData?.sido || "11";
    const sgg = kakaoAddressData?.sgg || "11410";
    const dp_nm = kakaoAddressData?.dp_nm || "연희동";
    const adm_nm = kakaoAddressData?.adm_nm || "서울 서대문구 연희동";

    console.log('✅ 주소 데이터:', { adm_cd2, sido, sgg, dp_nm, adm_nm });

    // 사용자 문서 생성
    const userData = {
      uid: user.uid,
      mobile: phoneNumber,
      name: nickname,
      role: "user",
      score: 0,
      coin: 0,
      saving_all: 0,
      bottle_all: 0,
      chargePolicy: true,
      terms: true,
      address: defaultAddress,
      adm_cd2: adm_cd2,
      sido: sido,
      sgg: sgg,
      dp_nm: dp_nm,
      adm_nm: adm_nm,
      create: serverTimestamp(),
      update: serverTimestamp()
    };

    console.log('💾 Firestore에 사용자 문서 저장 중...');
    await setDoc(userRef, userData);
    console.log('✅ 사용자 문서 저장 완료');

    // 🔑 Firebase Auth displayName 설정 (bottleclub 앱 연동용)
    console.log('🔑 Firebase Auth displayName 설정 중...');
    await updateProfile(user, { displayName: nickname });
    console.log('✅ displayName 설정 완료:', nickname);

    // 저장 확인
    console.log('🔍 저장된 문서 확인 중...');
    const verifyDoc = await getDoc(userRef);
    if (!verifyDoc.exists()) {
      console.error('❌ 문서가 생성되지 않았습니다! Firestore Security Rules를 확인하세요.');
      throw new Error('사용자 문서 생성 실패: 문서가 저장되지 않았습니다.');
    }
    console.log('✅ 문서 생성 확인 완료');

    // ✨ 신규 사용자에게 무료 대여권 1개 자동 지급 (balances 컬렉션)
    try {
      console.log('🎫 무료 대여권 지급 시작...');

      // 🔍 중복 방지: 이미 무료 대여권이 있는지 확인
      const existingVouchersQuery = query(
        collection(db, 'balances'),
        where('user_id', '==', user.uid),
        where('pgcode', '==', 'bottleclub')
      );
      const existingVouchers = await getDocs(existingVouchersQuery);

      if (!existingVouchers.empty) {
        console.log('⚠️ 이미 무료 대여권이 존재합니다. 중복 지급을 건너뜁니다.');
        console.log('   기존 대여권 개수:', existingVouchers.size);
        return { success: true, isNew: true, nickname };
      }

      // tid 생성: 0_bottleclub_free-YYYYMMDDHHMMSS 형식
      const now = new Date();

      // 한국 시간대(KST = UTC+9) 변환
      const kstOffset = 9 * 60; // 9시간을 분으로
      const kstTime = new Date(now.getTime() + (kstOffset + now.getTimezoneOffset()) * 60000);

      // 날짜/시간 컴포넌트 추출
      const year = kstTime.getFullYear();
      const month = String(kstTime.getMonth() + 1).padStart(2, '0');
      const day = String(kstTime.getDate()).padStart(2, '0');
      const hours = String(kstTime.getHours()).padStart(2, '0');
      const minutes = String(kstTime.getMinutes()).padStart(2, '0');
      const seconds = String(kstTime.getSeconds()).padStart(2, '0');

      // transaction_date: "YYYY-MM-DD HH:MM:SS" 형식
      const transactionDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

      // tid 타임스탬프: YYYYMMDDHHMMSS
      const tidTimestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;
      const tid = `0_bottleclub_free-${tidTimestamp}`;

      const voucherData = {
        user_id: user.uid,
        status: 'charge',  // 사용 가능 상태
        pgcode: 'bottleclub',  // 무료 대여권 식별자
        amount: 4000,  // 대여권 가격
        expired: 9999999999999,  // 만료 없음 (매우 큰 숫자로 표현)
        pay_info: '보틀클럽',  // 결제 정보
        tid: tid,  // 거래 ID
        transaction_date: transactionDate  // 거래 시간
      };

      console.log('💾 Firestore에 대여권 문서 저장 중...');
      const voucherRef = await addDoc(collection(db, 'balances'), voucherData);
      console.log('✅ 무료 대여권 1개 지급 완료 (balances 컬렉션):', voucherRef.id, tid);

      // 대여권 저장 확인
      const verifyVoucher = await getDoc(voucherRef);
      if (!verifyVoucher.exists()) {
        console.error('❌ 대여권 문서가 생성되지 않았습니다! Firestore Security Rules를 확인하세요.');
        throw new Error('대여권 생성 실패: 문서가 저장되지 않았습니다.');
      }
      console.log('✅ 대여권 문서 생성 확인 완료');

    } catch (voucherError) {
      console.error('❌ 무료 대여권 지급 실패:', voucherError);
      console.error('에러 상세:', {
        code: voucherError.code,
        message: voucherError.message,
        stack: voucherError.stack
      });
      // 대여권 지급 실패해도 사용자 생성은 성공으로 처리
    }

    console.log('🎉 신규 사용자 생성 프로세스 완료');
    return { success: true, isNew: true, nickname };

  } catch (error) {
    console.error('❌ 사용자 생성 실패:', error);
    console.error('에러 상세:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });
    return { success: false, error: error.message };
  }
};

/**
 * 사용자 정보 조회
 * @param {string} uid - 사용자 UID
 * @returns {Promise}
 */
export const getUserData = async (uid) => {
  try {
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return { success: false, error: '사용자 정보를 찾을 수 없습니다.' };
    }

    const userData = {
      ...userDoc.data(),
      id: userDoc.id
    };

    return { success: true, data: userData };

  } catch (error) {
    console.error('사용자 정보 조회 실패:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 전화번호로 사용자 조회
 * @param {string} phoneNumber - 전화번호 (예: 01012345678)
 * @returns {Promise}
 */
export const getUserByPhone = async (phoneNumber) => {
  try {
    // 전화번호 포맷 통일 (010 형식 - DB 저장 형식에 맞춤)
    // +821012345678 → 01012345678
    // 01012345678 → 01012345678 (그대로 유지)
    let formattedNumber = phoneNumber;
    if (phoneNumber.startsWith('+82')) {
      formattedNumber = '0' + phoneNumber.slice(3);
    }

    console.log('전화번호로 사용자 조회:', formattedNumber);

    // 백엔드 API를 통해 사용자 조회
    const apiUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const response = await fetch(`${apiUrl}/users/phone/${formattedNumber}`);

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: '등록되지 않은 전화번호입니다.' };
      }
      const errorData = await response.json();
      return { success: false, error: errorData.error || '사용자 조회 실패' };
    }

    const userData = await response.json();
    console.log('사용자 조회 성공:', userData.uid);
    return { success: true, user: userData };

  } catch (error) {
    console.error('전화번호로 사용자 조회 실패:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 사용자의 대여권 목록 조회 (balances 컬렉션 기반)
 * @param {string} uid - 사용자 UID
 * @returns {Promise} 대여권 배열 및 전체/사용가능 개수
 */
export const getUserTickets = async (uid) => {
  try {
    // 백엔드 API를 통해 대여권 조회
    const apiUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const response = await fetch(`${apiUrl}/users/${uid}/tickets`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '대여권 조회 실패');
    }

    const data = await response.json();

    console.log('대여권 조회 완료:', data.availableCount, '개 사용가능 /', data.totalCount, '개 전체');
    return {
      success: true,
      tickets: data.tickets,
      totalCount: data.totalCount,
      availableCount: data.availableCount
    };

  } catch (error) {
    console.error('대여권 조회 실패:', error);
    return {
      success: false,
      error: error.message,
      tickets: [],
      totalCount: 0,
      availableCount: 0
    };
  }
};

/**
 * 대여 처리 (여러 개의 컵을 한번에 대여)
 * @param {string} uid - 사용자 UID
 * @param {Array} tickets - 선택한 대여권 배열 (balances 문서들, create 순으로 정렬되어 있음)
 * @param {string} shopId - 가게 ID (디바이스의 shopId)
 * @param {string} shopName - 가게 이름
 * @returns {Promise}
 */
export const processRental = async (uid, tickets, shopId, shopName) => {
  try {
    // 백엔드 API를 통해 대여 처리
    const apiUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const response = await fetch(`${apiUrl}/users/rental`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uid,
        tickets,
        shopId,
        shopName
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '대여 처리 실패');
    }

    const data = await response.json();

    return {
      success: true,
      rentalIds: data.data.rentalIds,
      count: data.data.count
    };

  } catch (error) {
    console.error('대여 처리 실패:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 가게 정보 조회 (shopId로)
 * @param {string} shopId - 가게 ID
 * @returns {Promise}
 */
export const getShopData = async (shopId) => {
  try {
    const shopRef = doc(db, 'shops', shopId);
    const shopDoc = await getDoc(shopRef);

    if (!shopDoc.exists()) {
      return { success: false, error: '가게 정보를 찾을 수 없습니다.' };
    }

    const shopData = {
      ...shopDoc.data(),
      id: shopDoc.id
    };

    return { success: true, data: shopData };

  } catch (error) {
    console.error('가게 정보 조회 실패:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 카페명으로 가게 정보 조회
 * @param {string} cafeName - 카페 이름
 * @returns {Promise}
 */
export const getShopByName = async (cafeName) => {
  try {
    console.log('카페명으로 가게 조회:', cafeName);

    // shops 컬렉션에서 name 필드로 검색
    // Firebase 복합 인덱스 필요: name(==) + create(desc)
    const shopsQuery = query(
      collection(db, 'shops'),
      where('name', '==', cafeName),
      orderBy('create', 'desc')  // 최신 생성일 기준 정렬 (서버 사이드)
    );
    const shopsSnapshot = await getDocs(shopsQuery);

    if (shopsSnapshot.empty) {
      console.warn('카페명과 일치하는 가게를 찾을 수 없습니다:', cafeName);
      return { success: false, error: '등록되지 않은 카페입니다.' };
    }

    // 첫 번째 결과 반환 (이미 정렬되어 있으므로 최신 것)
    const shopDoc = shopsSnapshot.docs[0];
    const shopData = {
      ...shopDoc.data(),
      id: shopDoc.id
    };

    console.log('가게 조회 성공:', shopDoc.id, '- PIN:', shopData.pin);
    return { success: true, data: shopData };

  } catch (error) {
    console.error('카페명으로 가게 조회 실패:', error);
    return { success: false, error: error.message };
  }
};

/**
 * 사용자의 대여 중인 컵 조회
 * @param {string} uid - 사용자 UID
 * @param {string} shopId - 가게 ID (division에 따라 반납 가능 여부 필터링)
 * @returns {Promise} 대여 중인 컵 배열
 */
export const getUserActiveRentals = async (uid, shopId) => {
  try {
    // 백엔드 API를 통해 활성 대여 조회
    const apiUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const response = await fetch(`${apiUrl}/users/${uid}/rentals?shopId=${shopId}`);

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '대여 중인 컵 조회 실패');
    }

    const data = await response.json();

    console.log('대여 중인 컵 조회 완료:', data.rentals.length, '개');
    return { success: true, rentals: data.rentals };

  } catch (error) {
    console.error('대여 중인 컵 조회 실패:', error);
    return { success: false, error: error.message, rentals: [] };
  }
};

/**
 * 반납 처리 (여러 개의 컵을 한번에 반납)
 * @param {string} uid - 사용자 UID
 * @param {Array} rentals - 반납할 대여 기록 배열 (rents 문서들)
 * @param {string} shopId - 가게 ID
 * @param {string} shopName - 가게 이름
 * @returns {Promise}
 */
export const processReturn = async (uid, rentals, shopId, shopName) => {
  try {
    const returnCount = rentals.length;
    const scorePerCup = 10;  // 컵 1개당 10점

    // 백엔드 API 호출하여 전체 반납 프로세스 처리
    const apiUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const response = await fetch(`${apiUrl}/users/return`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        uid,
        rentals,
        shopId,
        shopName
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('⚠️ 반납 처리 실패:', errorData);
      throw new Error(errorData.error || '반납 처리 실패');
    }

    const result = await response.json();
    console.log('✅ 반납 처리 성공:', result);

    return {
      success: true,
      score: result.data.totalScore,  // 백엔드에서 계산된 실제 점수 (모든 반납)
      count: result.data.returnCount,
      collectHistoryId: result.data.collectHistoryId
    };

  } catch (error) {
    console.error('반납 처리 실패:', error);
    return { success: false, error: error.message };
  }
};
