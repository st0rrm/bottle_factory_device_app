import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './home.css';
import VerifyModal from '../../components/VerifyModal';
import ReturnModal from '../../components/ReturnModal';
import helpIcon from '../../assets/images/help.svg';
import HelpModal from '../../components/HelpModal';
import { getMyStats } from '../../api/statistics';
import { logout } from '../../api/auth';
import { usePicovoice } from '../../hooks/usePicovoice';

function HomeScreen() {
  const navigate = useNavigate();
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [cafeInfo, setCafeInfo] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    weekly: 0
  });

  // Wake word detection callback
  const handleWakeWordDetected = useCallback((keywordIndex) => {
    console.log('Wake word detected! Opening help modal...');
    setShowHelpModal(true);
  }, []);

  // Wake word detection hook (홈 화면에서만 활성화)
  const { isListening, error: picoError, hasPermission, requestPermission } = usePicovoice(
    true, // 홈 화면이 마운트되면 자동으로 활성화
    handleWakeWordDetected
  );

  // Wake word 상태 로깅 (개발 중 디버깅용)
  useEffect(() => {
    console.log('🎤 Wake word status:', { isListening, hasPermission, error: picoError });
  }, [isListening, hasPermission, picoError]);

  useEffect(() => {
    // localStorage에서 카페 정보 가져오기
    const userData = localStorage.getItem('userData');
    const userType = localStorage.getItem('userType');
    const authToken = localStorage.getItem('authToken');

    if (!userData || !authToken || userType !== 'cafe') {
      // 로그인하지 않았으면 로그인 페이지로
      navigate('/login', { replace: true });
      return;
    }

    const cafe = JSON.parse(userData);
    setCafeInfo(cafe);

    // 서버에서 통계 데이터 가져오기
    fetchStats();

    // 마이크 권한 요청 (wake word detection을 위해)
    if (!hasPermission) {
      requestPermission();
    }

    // 브라우저 뒤로가기 방지
    const handlePopState = () => {
      // 뒤로가기 시 다시 현재 페이지로
      window.history.pushState(null, '', window.location.pathname);
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate, hasPermission, requestPermission]);

  const fetchStats = async () => {
    try {
      const data = await getMyStats();
      setStats(data);
    } catch (error) {
      console.error('통계 불러오기 실패:', error);
      // 에러 발생 시 기본값 유지
    }
  };

  const handleBorrowCupAction = () => {
    setShowVerifyModal(true);
  };

  const handleReturnCupAction = () => {
    setShowReturnModal(true);
  };

  const handleHelpAction = () => {
    setShowHelpModal(true);
  };

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      logout();
      navigate('/login', { replace: true });
    }
  };

  // 로딩 중이거나 카페 정보가 없으면 빈 화면
  if (!cafeInfo) {
    return <div className="home-container">Loading...</div>;
  }

  return (
    <div className="home-container">
      {/* Header Section */}
      <div className="header-section">
        <div className="header-top">
          <h1 className="cafe-name">{cafeInfo.cafeName}</h1>
          <button className="logout-btn" onClick={handleLogout}>
            로그아웃
          </button>
        </div>
        <div className="total-count">
          <svg className="droplet-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
          </svg>
          <span className="count-number">{stats.total}</span>
        </div>
        <p className="sub-stats">
          오늘 <span className="stat-value">{stats.today}</span>회 | 주간 <span className="stat-value">{stats.weekly}</span>회
        </p>
      </div>

      {/* Tree Illustration Section - Placeholder for background image */}
      <div className="tree-section">
        {/* Background image will be added here */}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Bottom Action Bar (모달 개방 여부와 관계없이 항상 렌더링) */}
      {/* ------------------------------------------------------------- */}
      <div className="action-bar">
        <div className="action-bar-header">
          <div className="brand-info">
            <svg className="clock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <span className="brand-name">리턴미컵</span>
          </div>
          <div className="divider-line"></div>
          <div className="reward-info">
            <svg className="droplet-icon-small" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
            </svg>
            <span className="reward-value">+1</span>
          </div>
        </div>

        <div className="button-group">
          {/* Rent Button */}
          <button className="action-button rent-button" onClick={handleBorrowCupAction}>
            대여
          </button>

          {/* Return Button */}
          <button className="action-button return-button" onClick={handleReturnCupAction}>
            반납
          </button>

          {/* Help Section */}
          {/* 도움말 버튼은 Action Bar 외부에 있었으나, 이제 Action Bar 내부에 포함됩니다. */}
          <div className="help-section" onClick={handleHelpAction}>
            <img src={helpIcon} alt="Help" className="help-image" />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. Modals (항상 최상단에 조건부 렌더링) */}
      {/* ------------------------------------------------------------- */}
      {showVerifyModal && <VerifyModal onClose={() => setShowVerifyModal(false)} />}
      {showReturnModal && <ReturnModal onClose={() => setShowReturnModal(false)} />}
      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} />}
    </div>
  );
}

export default HomeScreen;