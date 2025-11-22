import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './home.css';
import VerifyModal from '../../components/VerifyModal';
import ReturnModal from '../../components/ReturnModal';
import DoModal from '../../components/DoModal';
import SettingsModal from '../../components/SettingsModal';
import helpIcon from '../../assets/images/help.svg';
import hillImage from '../../assets/images/front_hills_new 2.png'
import Waterpoint from '../../assets/images/waterpoint.png'
import HelpModal from '../../components/HelpModal';
import SuccessSnackbar from '../../components/SuccessSnackbar';
import TreeContainer from '../../components/TreeContainer';
import { getMyStats } from '../../api/statistics';
import { logout } from '../../api/auth';
import { usePicovoice } from '../../hooks/usePicovoice';
import { useVoiceRecognition } from '../../hooks/useVoiceRecognition'; // LLM 기반 음성 인식 (Whisper + Claude)
import { useBackground, OBJECTS_IMAGE } from '../../contexts/BackgroundContext';

function HomeScreen() {
  const navigate = useNavigate();
  const { currentBackground, showObjects } = useBackground();

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showDoModal, setShowDoModal] = useState(false);
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

  const [treeType, setTreeType] = useState('init');
  const [treeScore, setTreeScore] = useState(0);
  const messages = [
  ' 환경을 위하는 아름다운 당신! 😊 ',
  ' 당신의 참여가 동네를 푸르게 만들어요 🤝 ',
  ' 함께한 손길이 숲을 키우고 있어요 🕊️ ',
  ' 일회용컵 대신 리턴미컵! 나무에게 물을 주세요🌲 ',
  ' 지속가능한 습관, 우리 함께해요 🌏 ',
  ' 리턴미컵으로 테이크아웃하면 나무가 자라요! 🪴 ',
  ' 일상에서 불필요한 쓰레기를 줄일 수 있다면? 🤔 '
];

const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  // --------------------------------------------------------------------
  // FLOW TEXT SECTION: REF + EFFECT
  // --------------------------------------------------------------------
  const flowContainerRef = useRef(null);
  const flowInnerRef = useRef(null);

  useEffect(() => {
    const container = flowContainerRef.current;
    const inner = flowInnerRef.current;
    if (!container || !inner) return;

    const items = [...inner.querySelectorAll('.item')];

    let index = 0;
    let offset = 0;

    function next() {
      offset += items[index].offsetHeight;
      inner.style.transform = `translateY(${-offset}px)`;

      index++;
      if (index >= items.length) {
        index = 0;
        offset = 0;

        setTimeout(() => {
          inner.style.transition = "none";
          inner.style.transform = "translateY(0)";
          void inner.offsetHeight; // reflow 강제
          inner.style.transition = "transform 0.8s ease";
        }, 900);
      }
    }

    const interval = setInterval(next, 5000);

    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, 5000); // 5초마다 변경

    return () => clearInterval(interval);
  }, [messages.length]);
  // --------------------------------------------------------------------


  // action-bar bottom padding dynamic adjustment
  useEffect(() => {
    const updateTreeSectionPadding = () => {
      const actionBar = document.querySelector('.action-bar');
      const treeSection = document.querySelector('.tree-section');

      if (actionBar && treeSection) {
        treeSection.style.paddingBottom = `${actionBar.offsetHeight}px`;
      }
    };

    const timer = setTimeout(updateTreeSectionPadding, 100);
    window.addEventListener('resize', updateTreeSectionPadding);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTreeSectionPadding);
    };
  }, [cafeInfo]);

  const handleWakeWordDetected = useCallback((keywordIndex) => {
    setShowHelpModal(true);
  }, []);

  // 음성 인식 방법 선택

  // 방법 1: Picovoice (현재 사용 중)
  // const { isListening, error: picoError, hasPermission, requestPermission } =
  //   usePicovoice(true, handleWakeWordDetected);

  // 방법 2: LLM 기반 (Whisper + Claude)
  const { isListening, error: picoError, hasPermission, requestPermission } =
    useVoiceRecognition(true, handleWakeWordDetected, {
      segmentDuration: 5000,         // 5초마다 분석
      lowThreshold: 0.4,             // 0.4 미만 → 폐기
      highThreshold: 0.7,            // 0.7 이상 → 확정
      maxCumulativeDuration: 15000,  // 최대 15초 누적
      windowSize: 15000,             // 슬라이딩 윈도우 15초
      maxTotalDuration: 30000,       // 최대 30초
      vadThreshold: 40,              // VAD 음량 임계값 (0-255)
    });

  // load café info
  useEffect(() => {
    const userData = localStorage.getItem('userData');
    const userType = localStorage.getItem('userType');
    const authToken = localStorage.getItem('authToken');

    if (!userData || !authToken || userType !== 'cafe') {
      navigate('/login', { replace: true });
      return;
    }

    const cafe = JSON.parse(userData);
    setCafeInfo(cafe);

    fetchStats();

    if (!hasPermission) {
      requestPermission();
    }

    const handlePopState = () => {
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
    }
  };

  const handleBorrowCupAction = () => setShowVerifyModal(true);
  const handleReturnCupAction = () => setShowReturnModal(true);
  const handleDoAction = () => setShowDoModal(true);
  const handleHelpAction = () => setShowHelpModal(true);

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      logout();
      navigate('/login', { replace: true });
    }
  };

  const handleRentalSuccess = () => {
    setSnackbarMessage('🌱 대여가 완료되었습니다');
    setShowSuccessSnackbar(true);
    setTreeType('grow');
    setTreeScore(30);
    fetchStats();
    setTimeout(() => {
      setTreeType('init');
      setTreeScore(0);
    }, 3000);
  };

  const handleReturnSuccess = () => {
    setSnackbarMessage('🌱 반납이 완료되었습니다');
    setShowSuccessSnackbar(true);
    setTreeType('grow');
    setTreeScore(30);
    fetchStats();
    setTimeout(() => {
      setTreeType('init');
      setTreeScore(0);
    }, 3000);
  };

  const handleDoSuccess = (score) => {
    setSnackbarMessage('🌱 제로웨이스트 실천이 기록되었습니다');
    setShowSuccessSnackbar(true);
    setTreeType('grow');
    setTreeScore(score || 30);
    fetchStats();
    setTimeout(() => {
      setTreeType('init');
      setTreeScore(0);
    }, 3000);
  };

  // loading state
  if (!cafeInfo) {
    return <div className="home-container">Loading...</div>;
  }

  return (
    <div className="home-container">
      {/* Header Section */}
      <div className="header-section">
        <div className="header-top">
          <h1 className="cafe-name">{cafeInfo.cafeName}</h1>
        </div>

        <div className="total-score">
          <img src={Waterpoint} alt="waterpoint" className="waterpoint-image" />
          <span className="score-number">{stats.totalScore || 0}</span>
        </div>

        {/* ----------------- FLOWING TEXT AREA ----------------- */}
        <div className="flow-container">
          <div
            key={currentMessageIndex}   // key를 바꿔서 애니메이션 매번 다시 트리거
            className="flow-text"
          >
            {messages[currentMessageIndex]}
          </div>
        </div>
        {/* ------------------------------------------------------ */}
      </div>

      {/* Settings Button */}
      <button
        className="settings-button"
        onClick={() => setShowSettingsModal(true)}
        aria-label="설정"
      >
        ⚙️
      </button>

      {/* Tree Section */}
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

      {/* Bottom Action Bar */}
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
            <button className="action-button rent-button" onClick={handleBorrowCupAction}>
              대여
            </button>

            <button className="action-button return-button" onClick={handleReturnCupAction}>
              반납
            </button>

            <button className="action-button do-button" onClick={handleDoAction}>
              실천
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
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
          onSuccess={handleReturnSuccess}
        />
      )}

      {showDoModal && (
        <DoModal
          onClose={() => setShowDoModal(false)}
          onSuccess={handleDoSuccess}
        />
      )}

      {showHelpModal &&
        <HelpModal onClose={() => setShowHelpModal(false)} onUseButtonClick={handleBorrowCupAction} />
      }

      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

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
