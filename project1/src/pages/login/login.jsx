import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './login.css';

function LoginScreen() {
  const [cafeId, setCafeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    // TODO: 실제 로그인 API 연동
    if (cafeId && password) {
      // 임시: 로그인 성공 시 홈으로 이동
      navigate(`/home/${cafeId}`);
    } else {
      setError('카페 아이디와 비밀번호를 입력해주세요.');
    }
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

          <button type="submit" className="login-button">
            로그인
          </button>
        </form>

        <div className="login-footer">
          <p className="footer-text">리턴미컵 관리 시스템</p>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
