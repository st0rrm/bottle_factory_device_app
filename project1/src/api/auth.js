import apiClient from './axios';

// 관리자 로그인
export const adminLogin = async (username, password) => {
  try {
    const response = await apiClient.post('/admin/login', {
      username,
      password,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: '로그인 중 오류가 발생했습니다.' };
  }
};

// 카페 로그인
export const cafeLogin = async (cafeId, password) => {
  try {
    const response = await apiClient.post('/cafe/login', {
      cafeId,
      password,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: '로그인 중 오류가 발생했습니다.' };
  }
};

// 현재 관리자 정보 조회
export const getAdminInfo = async () => {
  try {
    const response = await apiClient.get('/admin/me');
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: '정보를 가져오는 중 오류가 발생했습니다.' };
  }
};

// 현재 카페 정보 조회
export const getCafeInfo = async () => {
  try {
    const response = await apiClient.get('/cafe/me');
    return response.data;
  } catch (error) {
    throw error.response?.data || { error: '정보를 가져오는 중 오류가 발생했습니다.' };
  }
};

// 로그아웃
export const logout = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('userType');
  localStorage.removeItem('userData');
};
