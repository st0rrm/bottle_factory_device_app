import apiClient from './axios';

// 현재 카페의 통계 조회
export const getMyStats = async () => {
  try {
    const response = await apiClient.get('/statistics/my-stats');
    return response.data;
  } catch (error) {
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
