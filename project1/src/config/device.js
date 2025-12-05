// 디바이스 설정 파일
// 로그인한 카페의 ID를 사용하여 동적으로 shopId를 가져옵니다

import { getShopByName } from '../firebase/firestore';

/**
 * 현재 로그인한 카페의 shopId 가져오기 (동기 - 하위 호환성)
 * localStorage의 userData에서 cafeId를 읽어옵니다.
 * @deprecated 새 코드에서는 getDeviceShopIdAsync()를 사용하세요.
 */
export const getDeviceShopId = () => {
  const userData = localStorage.getItem('userData');
  if (!userData) {
    console.warn('로그인 정보가 없습니다.');
    return null;
  }
  try {
    const cafeData = JSON.parse(userData);
    return cafeData.cafeId;
  } catch (error) {
    console.error('카페 정보 파싱 오류:', error);
    return null;
  }
};

/**
 * 현재 로그인한 카페명으로 Firebase shops 컬렉션에서 shopId 가져오기 (비동기)
 * localStorage의 userData에서 cafeName을 읽고, Firebase에서 해당 shop 문서의 ID를 반환합니다.
 * @returns {Promise<{shopId: string|null, shopName: string|null, shopData: object|null}>}
 */
export const getDeviceShopIdAsync = async () => {
  const userData = localStorage.getItem('userData');
  if (!userData) {
    console.warn('로그인 정보가 없습니다.');
    return { shopId: null, shopName: null, shopData: null };
  }

  try {
    const cafeData = JSON.parse(userData);
    const cafeName = cafeData.cafeName;

    if (!cafeName) {
      console.error('카페명이 없습니다.');
      return { shopId: null, shopName: null, shopData: null };
    }

    // Firebase에서 카페명으로 shop 검색
    const shopResult = await getShopByName(cafeName);

    if (shopResult.success) {
      return {
        shopId: shopResult.data.id,
        shopName: shopResult.data.name,
        shopData: shopResult.data
      };
    } else {
      console.error('Firebase에서 카페 정보를 찾을 수 없습니다:', cafeName);
      return { shopId: null, shopName: null, shopData: null };
    }
  } catch (error) {
    console.error('카페 정보 조회 오류:', error);
    return { shopId: null, shopName: null, shopData: null };
  }
};

/**
 * 디바이스 설정 정보
 */
export const DEVICE_CONFIG = {
  getShopId: getDeviceShopId,
  getShopName: () => {
    const userData = localStorage.getItem('userData');
    if (!userData) return "알 수 없음";
    try {
      const cafeData = JSON.parse(userData);
      return cafeData.cafeName || "알 수 없음";
    } catch {
      return "알 수 없음";
    }
  },

  // QR 코드도 로그인한 카페의 shopId를 인코딩해서 사용
  getQRContent: () => getDeviceShopId()
};

export default DEVICE_CONFIG;
