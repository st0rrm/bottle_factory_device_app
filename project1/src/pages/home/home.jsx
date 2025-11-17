import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './home.css';
import VerifyModal from '../../components/VerifyModal';
import ReturnModal from '../../components/ReturnModal';
import SettingsModal from '../../components/SettingsModal';
import helpIcon from '../../assets/images/help.svg';
import hillImage from '../../assets/images/front_hills_new 1.png'
import HelpModal from '../../components/HelpModal';
import SuccessSnackbar from '../../components/SuccessSnackbar';
import TreeContainer from '../../components/TreeContainer';
import { getMyStats } from '../../api/statistics';
import { logout } from '../../api/auth';
import { usePicovoice } from '../../hooks/usePicovoice';
import { useBackground, OBJECTS_IMAGE } from '../../contexts/BackgroundContext';

function HomeScreen() {
  const navigate = useNavigate();
  const { currentBackground, showObjects } = useBackground();
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [cafeInfo, setCafeInfo] = useState(null);
  const [stats, setStats] = useState({
    totalScore: 0,
    totalCount: 0,
    today: 0,
    weekly: 0
  });
  const [treeType, setTreeType] = useState('init'); // 'init' | 'grow'
  const [treeScore, setTreeScore] = useState(0); // 나무 성장용 점수

  // action-bar 높이에 따라 tree-section 하단 여백 동적 조정
  useEffect(() => {
    const updateTreeSectionPadding = () => {
      const actionBar = document.querySelector('.action-bar');
      const treeSection = document.querySelector('.tree-section');

      if (actionBar && treeSection) {
        const actionBarHeight = actionBar.offsetHeight;
        console.log('🔧 action-bar 높이:', actionBarHeight);

        // paddingBottom 적용
        treeSection.style.paddingBottom = `${actionBarHeight}px`;

        console.log('✅ tree-section paddingBottom 설정:', treeSection.style.paddingBottom);
        console.log('📏 tree-section computed paddingBottom:', window.getComputedStyle(treeSection).paddingBottom);
      } else {
        console.warn('⚠️ action-bar 또는 tree-section을 찾을 수 없습니다');
      }
    };

    // 약간의 지연 후 초기 설정 (DOM이 완전히 렌더링된 후)
    const timer = setTimeout(updateTreeSectionPadding, 100);

    // 윈도우 리사이즈 시 재계산
    window.addEventListener('resize', updateTreeSectionPadding);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTreeSectionPadding);
    };
  }, [cafeInfo]); // cafeInfo가 로드된 후 실행

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

  const handleRentalSuccess = () => {
    setSnackbarMessage('🌱 대여가 완료되었습니다');
    setShowSuccessSnackbar(true);

    // 나무 성장 (bottleclub Main.tsx:151-158 참고)
    setTreeType('grow');
    setTreeScore(30); // 적립 1회 = 30점

    // 통계 업데이트
    fetchStats();

    // 성장 애니메이션 후 초기화
    setTimeout(() => {
      setTreeType('init');
      setTreeScore(0);
    }, 3000);
  };

  const handleReturnSuccess = () => {
    setSnackbarMessage('🌱 반납이 완료되었습니다');
    setShowSuccessSnackbar(true);

    // 나무 성장
    setTreeType('grow');
    setTreeScore(30);

    // 통계 업데이트
    fetchStats();

    // 성장 애니메이션 후 초기화
    setTimeout(() => {
      setTreeType('init');
      setTreeScore(0);
    }, 3000);
  };

  // Debug: Log when background changes (must be before conditional return)
  useEffect(() => {
    console.log('🎨 Background changed:', currentBackground.id, currentBackground.backgroundImage);
    console.log('🌥️ Show objects:', showObjects);
  }, [currentBackground, showObjects]);

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
          {/* <button className="logout-btn" onClick={handleLogout}>
            로그아웃
          </button> */}
        </div>
        <div className="total-score">
          <svg className="droplet-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
          </svg>
          <span className="score-number">{stats.totalScore || 0}</span>
        </div>
        {/* <p className="sub-stats">
          오늘 <span className="stat-value">{stats.today}</span>회 | 주간 <span className="stat-value">{stats.weekly}</span>회
        </p> */}
      </div>

      {/* Settings Button - 우측 상단 */}
      <button
        className="settings-button"
        onClick={() => setShowSettingsModal(true)}
        aria-label="설정"
      >
        ⚙️
      </button>

      {/* Tree Illustration Section */}
      <div className="tree-section">
        <TreeContainer
          type={treeType}
          score={treeScore}
          cafeId={cafeInfo?.cafeId || 'demo_cafe'}
          totalScore={stats.totalScore}
          totalCount={stats.totalCount}
          cafeInfo={cafeInfo}
          backgroundImage={currentBackground.backgroundImage}
          objectImage={showObjects ? OBJECTS_IMAGE : null}
        />
      </div>

      <div className="hill-section">
        <img src={hillImage} alt="hill" className="hill-image" />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. Bottom Action Bar (모달 개방 여부와 관계없이 항상 렌더링) */}
      {/* ------------------------------------------------------------- */}
      <div className="action-section">
        <div className="action-bar">
          <div className="action-bar-header">
            <div className="cup-info">
              <div className="brand-info">
                <span className="brand-name">리턴미컵</span>
              </div>
              <div className="help-section" onClick={handleHelpAction}>
                <svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="11.5" cy="11.5" r="11.5" fill="#438ECF"/> 
                  <text 
                    x="50%" 
                    y="70%" 
                    text-anchor="middle" 
                    font-family="Arial, sans-serif" 
                    font-size="16" 
                    fill="white" 
                    font-weight="bold">
                    ?
                  </text>
                </svg>
                <span className="help-text">도움말</span>
              </div>
            </div>
            
            <div className="do-section">
              <span className="do-text">기타 제로웨이스트</span>
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
            <button className="action-button do-button" onClick={handleReturnCupAction}>
            실천
            </button>
        </div>
          {/* Return Button */}
          

          {/* Help Section */}
          {/* 도움말 버튼은 Action Bar 외부에 있었으나, 이제 Action Bar 내부에 포함됩니다. */}

        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 3. Modals (항상 최상단에 조건부 렌더링) */}
      {/* ------------------------------------------------------------- */}
      {showVerifyModal && (
        <VerifyModal
          onClose={() => setShowVerifyModal(false)}
          onOpenReturn={() => {
            setShowVerifyModal(false);
            setShowReturnModal(true);
          }}
          onSuccess={handleRentalSuccess}
        />
      )}
      {showReturnModal && (
        <ReturnModal
          onClose={() => setShowReturnModal(false)}
          onOpenRental={() => {
            setShowVerifyModal(false);
            setShowVerifyModal(true);
          }}
          onSuccess={handleReturnSuccess}
        />
      )}
      {showHelpModal && <HelpModal onClose={() => setShowHelpModal(false)} onUseButtonClick={handleBorrowCupAction} />}
      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Success Snackbar */}
      {showSuccessSnackbar && (
        <SuccessSnackbar
          message={snackbarMessage}
          onClose={() => setShowSuccessSnackbar(false)}
          duration={3000}
        />
      )}
    </div>
  );
}

export default HomeScreen;