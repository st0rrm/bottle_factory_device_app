import apiClient from './axios';

// 카페 목록 조회 (관리자 전용)
export const getCafes = async () => {
  try {
    const response = await apiClient.get('/cafe');
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: '카페 목록을 가져오는 중 오류가 발생했습니다.' };
  }
};

// 카페 생성 (관리자 전용)
export const createCafe = async (cafeData) => {
  try {
    const response = await apiClient.post('/cafe', cafeData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: '카페 생성 중 오류가 발생했습니다.' };
  }
};

// 카페 수정 (관리자 전용)
export const updateCafe = async (cafeId, cafeData) => {
  try {
    const response = await apiClient.put(`/cafe/${cafeId}`, cafeData);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: '카페 수정 중 오류가 발생했습니다.' };
  }
};

// 카페 비밀번호 변경 (관리자 전용)
export const updateCafePassword = async (cafeId, newPassword) => {
  try {
    const response = await apiClient.put(`/cafe/${cafeId}/password`, {
      newPassword,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: '비밀번호 변경 중 오류가 발생했습니다.' };
  }
};

// 카페 삭제 (관리자 전용)
export const deleteCafe = async (cafeId) => {
  try {
    const response = await apiClient.delete(`/cafe/${cafeId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: '카페 삭제 중 오류가 발생했습니다.' };
  }
};
