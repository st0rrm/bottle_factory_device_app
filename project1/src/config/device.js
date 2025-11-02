// 디바이스 설정 파일
// 로그인한 카페의 ID를 사용하여 동적으로 shopId를 가져옵니다

/**
 * 현재 로그인한 카페의 shopId 가져오기
 * localStorage의 userData에서 cafeId를 읽어옵니다.
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
