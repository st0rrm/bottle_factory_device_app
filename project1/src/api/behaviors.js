import apiClient from './axios';

// 행동 추적 기록
export const trackBehavior = async (actionType, actionDetail) => {
  try {
    const response = await apiClient.post('/behaviors/track', {
      actionType,
      actionDetail
    });
    return response.data;
  } catch (error) {
    // 행동 추적 실패는 조용히 처리 (사용자 경험에 영향 없음)
    console.error('Behavior tracking failed:', error);
    return null;
  }
};

// 현재 카페의 탭 전환 통계 조회
export const getMyTabStats = async () => {
  try {
    const response = await apiClient.get('/behaviors/my-tab-stats');
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: '탭 통계를 가져오는 중 오류가 발생했습니다.' };
  }
};

// 모든 카페의 행동 통계 요약 조회 (관리자 전용)
export const getAllCafesBehaviorStats = async () => {
  try {
    const response = await apiClient.get('/behaviors/all-cafes');
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: '행동 통계를 가져오는 중 오류가 발생했습니다.' };
  }
};

// 특정 카페의 탭 통계 조회 (관리자 전용)
export const getCafeTabStats = async (cafeId) => {
  try {
    const response = await apiClient.get(`/behaviors/cafe/${cafeId}/tab-stats`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: '카페 탭 통계를 가져오는 중 오류가 발생했습니다.' };
  }
};

// 특정 카페의 최근 행동 내역 조회 (관리자 전용)
export const getCafeRecentBehaviors = async (cafeId, limit = 100) => {
  try {
    const response = await apiClient.get(`/behaviors/cafe/${cafeId}/recent`, {
      params: { limit }
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: '카페 행동 내역을 가져오는 중 오류가 발생했습니다.' };
  }
};
