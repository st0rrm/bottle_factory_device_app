import apiClient from './axios';

// 현재 카페의 통계 조회
export const getMyStats = async () => {
  try {
    const response = await apiClient.get('/statistics/my-stats');
    console.log('📊 API 통계 데이터 받음:', response.data);
    console.log('  - totalScore:', response.data.totalScore);
    console.log('  - totalCount:', response.data.totalCount);
    console.log('  - today:', response.data.today);
    console.log('  - weekly:', response.data.weekly);
    return response.data;
  } catch (error) {
    // 개발 모드: 백엔드가 없을 때 목(mock) 데이터 반환
    const token = localStorage.getItem('authToken');
    if (token === 'dev-token-12345') {
      console.log('개발 모드: 목 통계 데이터 사용');
      return {
        totalScore: 150,  // 총 보틀 점수 (3개 * 30점)
        totalCount: 5,   // 총 적립 횟수 3회 (나무 가지 3개)
        today: 1,        // 오늘 1회
        weekly: 1        // 주간 1회
      };
    }
    throw error.response?.data || { error: '통계를 가져오는 중 오류가 발생했습니다.' };
  }
};

// 현재 카페의 거래 내역 조회
export const getMyHistory = async (limit = 50, offset = 0) => {
  try {
    const response = await apiClient.get('/statistics/my-history', {
      params: { limit, offset }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: '거래 내역을 가져오는 중 오류가 발생했습니다.' };
  }
};

// 거래 기록 추가 (대여 또는 반납)
export const addTransaction = async (transactionType, phoneNumber, quantity = 1) => {
  try {
    const response = await apiClient.post('/statistics/transaction', {
      transactionType,
      phoneNumber,
      quantity
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: '거래 기록 중 오류가 발생했습니다.' };
  }
};

// 특정 카페의 통계 조회 (관리자 전용)
export const getCafeStats = async (cafeId) => {
  try {
    const response = await apiClient.get(`/statistics/cafe/${cafeId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: '카페 통계를 가져오는 중 오류가 발생했습니다.' };
  }
};

// 특정 카페의 거래 내역 조회 (관리자 전용)
export const getCafeHistory = async (cafeId, limit = 50, offset = 0) => {
  try {
    const response = await apiClient.get(`/statistics/cafe/${cafeId}/history`, {
      params: { limit, offset }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: '카페 거래 내역을 가져오는 중 오류가 발생했습니다.' };
  }
};

// 모든 카페의 통계 요약 조회 (관리자 전용)
export const getAllCafesStats = async () => {
  try {
    const response = await apiClient.get('/statistics/all-cafes');
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: '전체 통계를 가져오는 중 오류가 발생했습니다.' };
  }
};
