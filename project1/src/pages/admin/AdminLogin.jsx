import React, { useState, useEffect } from 'react';
import './AdminLogin.css';
import xIcon from '../../assets/images/x_icon.svg';
import { adminLogin, cafeLogin } from '../../api/auth';
import { useNavigate } from 'react-router-dom';

function AdminLogin({ onClose, onLoginSuccess, forSettings = false, currentCafeId }) {
  const navigate = useNavigate();
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 설정 접근용일 때 15초 후 자동 닫기
  useEffect(() => {
    if (forSettings) {
      const timer = setTimeout(() => {
        onClose();
      }, 15000); // 15초

      return () => clearTimeout(timer);
    }
  }, [forSettings, onClose]);

  const handleLogin = async () => {
    if (!adminId || !password) {
      setErrorMessage('아이디와 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      console.log('로그인 시도:', adminId);

      // 먼저 관리자 로그인 시도
      try {
        console.log('관리자 로그인 시도 중...');
        const data = await adminLogin(adminId, password);

        console.log('관리자 로그인 성공:', data);

        // 설정 접근용이 아닐 때만 토큰 저장
        if (!forSettings) {
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('userType', 'admin');
          localStorage.setItem('userData', JSON.stringify(data.admin));
        }

        // 로그인 성공 처리
        onLoginSuccess(data.admin);

        // 설정 접근용이 아니면 AdminDashboard로 이동
        if (!forSettings) {
          navigate('/admin/dashboard');
        }
        return;
      } catch (adminError) {
        console.log('관리자 로그인 실패, 카페 로그인 시도:', adminError);

        // 관리자 로그인 실패 시 카페 로그인 시도
        try {
          console.log('카페 로그인 시도 중...');
          const data = await cafeLogin(adminId, password);

          console.log('카페 로그인 성공:', data);

          // 설정 접근용일 경우
          if (forSettings) {
            // 현재 접속 중인 카페 계정인지 확인
            if (currentCafeId && data.cafe.id !== currentCafeId) {
              throw new Error('현재 접속 중인 카페 계정으로만 접근할 수 있습니다.');
            }
            onLoginSuccess(data.cafe);
            return;
          }

          // 설정 접근용이 아닐 때만 토큰 저장 및 페이지 이동
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('userType', 'cafe_stats'); // 통계 보기용 카페 로그인
          localStorage.setItem('userData', JSON.stringify(data.cafe));

          console.log('localStorage 저장 완료:', {
            authToken: localStorage.getItem('authToken'),
            userType: localStorage.getItem('userType'),
            userData: localStorage.getItem('userData')
          });

          // 카페 통계 페이지로 이동 (먼저 navigate, 그 다음 모달 닫기)
          navigate('/cafe-stats', { replace: true });
          onClose();
          return;
        } catch (cafeError) {
          // 둘 다 실패
          console.error('카페 로그인 실패:', cafeError);
          throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
        }
      }
    } catch (error) {
      console.error('최종 로그인 실패:', error);
      setErrorMessage(error.message || error.error || '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="admin-login-overlay" onClick={onClose}>
      <div className="admin-login-modal" onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button onClick={onClose} className="admin-close-button">
          <img src={xIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
        </button>

        <div className="admin-login-content">
          {/* Title */}
          <h2 className="admin-login-title">리턴미컵 관리 시스템</h2>
          <p className="admin-login-subtitle">관리자 또는 카페 ID로 로그인</p>

          {/* Login Form */}
          <div className="admin-login-form">
            {/* Admin ID Input */}
            <div className="admin-input-group">
              <label className="admin-input-label">아이디</label>
              <input
                type="text"
                className="admin-input"
                placeholder="아이디를 입력하세요"
                value={adminId}
                onChange={(e) => setAdminId(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>

            {/* Password Input */}
            <div className="admin-input-group">
              <label className="admin-input-label">비밀번호</label>
              <input
                type="password"
                className="admin-input"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
              />
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="admin-error-message">{errorMessage}</div>
            )}

            {/* Login Button */}
            <button
              className="admin-login-button"
              onClick={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
