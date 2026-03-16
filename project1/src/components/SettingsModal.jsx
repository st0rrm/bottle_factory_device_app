import React, { useState, useEffect } from 'react';
import { useBackground } from '../contexts/BackgroundContext';
import { logout } from '../api/auth';
import { changeCafePassword } from '../api/cafe';
import { useNavigate } from 'react-router-dom';
import xIcon from '../assets/images/x_icon.svg';
import './SettingsModal.css';

function SettingsModal({ isOpen, onClose, onCafeNameChange, onTreeRegenerate }) {
  const navigate = useNavigate();
  const { currentBackground, changeBackground, availableBackgrounds, showObjects, toggleObjects } = useBackground();

  // 가게 이름 상태
  const [customCafeName, setCustomCafeName] = useState('');
  const [originalCafeName, setOriginalCafeName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);

  // 비밀번호 변경 상태
  const [isEditingPassword, setIsEditingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  // localStorage에서 가게 이름 로드, 모달 닫힐 때 비밀번호 폼 초기화
  useEffect(() => {
    if (isOpen) {
      const userData = localStorage.getItem('userData');
      if (userData) {
        const cafe = JSON.parse(userData);
        setOriginalCafeName(cafe.cafeName || '');

        // 커스텀 이름이 있으면 사용, 없으면 원본 이름
        const savedCustomName = localStorage.getItem('customCafeName');
        setCustomCafeName(savedCustomName || cafe.cafeName || '');
      }
    } else {
      setIsEditingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordError('');
    }
  }, [isOpen]);

  // 가게 이름 저장
  const handleSaveCafeName = () => {
    if (customCafeName.trim() === '') {
      alert('가게 이름을 입력해주세요.');
      return;
    }

    localStorage.setItem('customCafeName', customCafeName.trim());
    setIsEditingName(false);

    // 부모 컴포넌트에 변경 알림
    if (onCafeNameChange) {
      onCafeNameChange(customCafeName.trim());
    }

    alert('가게 이름이 변경되었습니다.');
  };

  // 기본값으로 복원
  const handleResetCafeName = () => {
    if (window.confirm('서버에 등록된 기본 가게 이름으로 복원하시겠습니까?')) {
      localStorage.removeItem('customCafeName');
      setCustomCafeName(originalCafeName);
      setIsEditingName(false);

      // 부모 컴포넌트에 변경 알림
      if (onCafeNameChange) {
        onCafeNameChange(originalCafeName);
      }

      alert('기본 가게 이름으로 복원되었습니다.');
    }
  };

  // 비밀번호 변경
  const handleChangePassword = async () => {
    setPasswordError('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('모든 항목을 입력해주세요.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsPasswordLoading(true);
    try {
      await changeCafePassword(currentPassword, newPassword);
      alert('비밀번호가 변경되었습니다.');
      setIsEditingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError(error.error || '비밀번호 변경에 실패했습니다.');
    } finally {
      setIsPasswordLoading(false);
    }
  };

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
    <div className="settings-modal-overlay">
      <div className="settings-modal">
        {/* Close Button */}
        <button onClick={onClose} className="settings-close-button">
          <img src={xIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
        </button>

        <h2>설정</h2>

        {/* 가게 이름 편집 */}
        <section className="settings-section">
          <h3>가게 이름</h3>
          <div className="cafe-name-section">
            {!isEditingName ? (
              <div className="cafe-name-display">
                <div className="cafe-name-current">
                  <strong>{customCafeName}</strong>
                  {localStorage.getItem('customCafeName') && (
                    <span className="custom-badge">커스텀</span>
                  )}
                </div>
                <div className="cafe-name-buttons">
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="edit-name-btn"
                  >
                    이름 변경
                  </button>
                  {localStorage.getItem('customCafeName') && (
                    <button
                      onClick={handleResetCafeName}
                      className="reset-name-btn"
                    >
                      기본값 복원
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="cafe-name-edit">
                <input
                  type="text"
                  value={customCafeName}
                  onChange={(e) => setCustomCafeName(e.target.value)}
                  placeholder="가게 이름을 입력하세요"
                  className="cafe-name-input"
                  maxLength={50}
                />
                <div className="cafe-name-edit-buttons">
                  <button onClick={handleSaveCafeName} className="save-name-btn">
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingName(false);
                      const savedName = localStorage.getItem('customCafeName');
                      setCustomCafeName(savedName || originalCafeName);
                    }}
                    className="cancel-name-btn"
                  >
                    취소
                  </button>
                </div>
                <p className="cafe-name-hint">
                  기본값: {originalCafeName}
                </p>
              </div>
            )}
          </div>
        </section>

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

        {/* 비밀번호 변경 */}
        <section className="settings-section">
          <h3>비밀번호 변경</h3>
          {!isEditingPassword ? (
            <button
              className="edit-name-btn"
              onClick={() => setIsEditingPassword(true)}
            >
              비밀번호 변경
            </button>
          ) : (
            <div className="password-edit">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="현재 비밀번호"
                className="cafe-name-input"
              />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호"
                className="cafe-name-input"
              />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호 확인"
                className="cafe-name-input"
              />
              {passwordError && (
                <p className="password-error">{passwordError}</p>
              )}
              <div className="cafe-name-edit-buttons">
                <button
                  onClick={handleChangePassword}
                  className="save-name-btn"
                  disabled={isPasswordLoading}
                >
                  {isPasswordLoading ? '변경 중...' : '저장'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingPassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                  }}
                  className="cancel-name-btn"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </section>

        {/* 나무 관리 */}
        <section className="settings-section">
          <h3>나무 관리</h3>
          <p className="tree-regen-desc">
            현재 점수 수준은 유지하면서 나무 모양을 새로 생성합니다.
          </p>
          <button
            className="tree-regen-btn"
            onClick={() => {
              if (window.confirm('나무를 새로 생성하시겠습니까?\n현재 점수 수준은 유지됩니다.')) {
                onTreeRegenerate?.();
                onClose();
              }
            }}
          >
            나무 다시 생성
          </button>
        </section>

        {/* 계정 관리 */}
        <section className="settings-section">
          <h3>계정</h3>
          <button onClick={handleLogout} className="logout-btn">
            로그아웃
          </button>
        </section>
      </div>
    </div>
  );
}

export default SettingsModal;
