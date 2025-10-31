// 디바이스 설정 파일
// 각 디바이스마다 환경 변수에서 shopId를 설정합니다

/**
 * 현재 디바이스의 가게 ID
 * .env 파일에서 VITE_DEVICE_SHOP_ID로 설정
 *
 * shopId는 Firestore의 shops 컬렉션 문서 ID입니다.
 * 예: "05THWyH9oRw1TH9YtNf4" (플라프리)
 */
export const DEVICE_SHOP_ID = import.meta.env.VITE_DEVICE_SHOP_ID;

/**
 * 디바이스 설정 정보
 */
export const DEVICE_CONFIG = {
  shopId: DEVICE_SHOP_ID,
  shopName: "테스트 카페", // 표시용 (실제로는 Firestore에서 가져옴)

  // QR 코드도 이 shopId를 인코딩해서 사용
  getQRContent: () => DEVICE_SHOP_ID
};

export default DEVICE_CONFIG;
