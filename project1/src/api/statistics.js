import apiClient from './axios';
import * as XLSX from 'xlsx';

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

// 거래 기록 추가 (대여, 반납, 또는 실천)
export const addTransaction = async (transactionType, phoneNumber, quantity = 1, score = null) => {
  try {
    const payload = {
      transactionType,
      phoneNumber,
      quantity
    };

    // score가 제공되면 포함
    if (score !== null) {
      payload.score = score;
    }

    const response = await apiClient.post('/statistics/transaction', payload);
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

// 특정 카페의 통계 초기화 (관리자 전용)
export const resetCafeStats = async (cafeId) => {
  try {
    const response = await apiClient.delete(`/statistics/cafe/${cafeId}/reset`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: '카페 통계 초기화 중 오류가 발생했습니다.' };
  }
};

// 카페 거래 상세 내역 조회 (관리자 전용)
export const getCafeTransactionDetails = async (cafeId, options = {}) => {
  try {
    const { limit = 100, offset = 0, type = null } = options;

    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    });

    if (type) {
      params.append('type', type);
    }

    const response = await apiClient.get(
      `/statistics/cafe/${cafeId}/transactions?${params.toString()}`
    );
    return response.data;
  } catch (error) {
    throw error.response?.data || {
      error: '거래 내역을 가져오는 중 오류가 발생했습니다.'
    };
  }
};
