import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './login.css';
import AdminLogin from '../admin/AdminLogin';
import { cafeLogin } from '../../api/auth';

function LoginScreen() {
  const [cafeId, setCafeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!cafeId || !password) {
      setError('카페 아이디와 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await cafeLogin(cafeId, password);

      // 토큰과 사용자 정보 저장
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userType', 'cafe');
      localStorage.setItem('userData', JSON.stringify(data.cafe));

      // 로그인 성공 시 홈으로 이동 (히스토리 대체)
      navigate(`/home/${data.cafe.cafeId}`, { replace: true });
    } catch (error) {
      setError(error.error || '로그인 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminClick = () => {
    setShowAdminLogin(true);
  };

  const handleAdminLoginSuccess = (adminData) => {
    setShowAdminLogin(false);
    console.log('관리자 로그인 성공:', adminData);
    // 관리자 대시보드로 이동 (히스토리 대체)
    navigate('/admin/dashboard', { replace: true });
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">리턴미컵</h1>
          <p className="login-subtitle">카페 관리자 로그인</p>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="cafeId" className="form-label">카페 아이디</label>
            <input
              type="text"
              id="cafeId"
              className="form-input"
              value={cafeId}
              onChange={(e) => setCafeId(e.target.value)}
              placeholder="카페 아이디를 입력하세요"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">비밀번호</label>
            <input
              type="password"
              id="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="login-footer">
          <p className="footer-text" onClick={handleAdminClick}>리턴미컵 관리 시스템</p>
        </div>
      </div>

      {/* Admin Login Modal */}
      {showAdminLogin && (
        <AdminLogin
          onClose={() => setShowAdminLogin(false)}
          onLoginSuccess={handleAdminLoginSuccess}
        />
      )}
    </div>
  );
}

export default LoginScreen;
