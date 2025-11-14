import React from 'react';
import { useBackground } from '../contexts/BackgroundContext';
import { logout } from '../api/auth';
import { useNavigate } from 'react-router-dom';
import './SettingsModal.css';

function SettingsModal({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { currentBackground, changeBackground, availableBackgrounds, showObjects, toggleObjects } = useBackground();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <h2>설정</h2>

        {/* 배경 선택 */}
        <section className="settings-section">
          <h3>배경 이미지</h3>
          <div className="background-grid">
            {availableBackgrounds.map((bg) => (
              <div
                key={bg.id}
                className={`background-option ${currentBackground.id === bg.id ? 'selected' : ''}`}
                onClick={() => {
                  console.log('배경 클릭:', bg.id);
                  changeBackground(bg.id);
                }}
              >
                <img
                  src={bg.thumbnail}
                  alt={bg.name}
                />
                <span>{bg.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 오브젝트 표시 옵션 */}
        <section className="settings-section">
          <h3>배경 오브젝트</h3>
          <div className="toggle-option">
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showObjects}
                onChange={toggleObjects}
                className="toggle-checkbox"
              />
              <span className="toggle-slider"></span>
              <span className="toggle-text">
                {showObjects ? '구름/해 표시' : '구름/해 숨김'}
              </span>
            </label>
          </div>
        </section>

        {/* 계정 관리 */}
        <section className="settings-section">
          <h3>계정</h3>
          <button onClick={handleLogout} className="logout-btn">
            로그아웃
          </button>
        </section>

        <button onClick={onClose} className="close-btn">
          닫기
        </button>
      </div>
    </div>
  );
}

export default SettingsModal;
