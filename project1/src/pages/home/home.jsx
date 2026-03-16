import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './home.css';
import VerifyModal from '../../components/VerifyModal';
import ReturnModal from '../../components/ReturnModal';
import DoModal from '../../components/DoModal';
import SettingsModal from '../../components/SettingsModal';
import AdminLogin from '../admin/AdminLogin';
import helpIcon from '../../assets/images/help.svg';
import hillImage from '../../assets/images/front_hills_new 2.png'
import Waterpoint from '../../assets/images/waterpoint.png'
import HelpModal from '../../components/HelpModal';
import SuccessSnackbar from '../../components/SuccessSnackbar';
import SurveyQRModal from '../../components/SurveyQRModal';
// import TreeContainer from '../../components/TreeContainer';
import TreeContainer from '../../components/TreeContainer_firebase';
import { getMyStats } from '../../api/statistics';
import { logout } from '../../api/auth';
import { db } from '../../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
// import { usePicovoice } from '../../hooks/usePicovoice'; // 음성인식 비활성화
// import { useVoiceRecognition } from '../../hooks/useVoiceRecognition'; // 음성인식 비활성화 (LLM 기반 음성 인식 GPT-4o-mini-transcribe + Claude)
import { useBackground, OBJECTS_IMAGE } from '../../contexts/BackgroundContext';
import { getShopByName } from '../../firebase/firestore';

const INACTIVITY_TIMEOUT = 3 * 60 * 1000; // 3분

function HomeScreen() {
  const navigate = useNavigate();
  const { currentBackground, showObjects } = useBackground();

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showDoModal, setShowDoModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showAdminLoginModal, setShowAdminLoginModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showSuccessSnackbar, setShowSuccessSnackbar] = useState(false);
  const [showSurveyQRModal, setShowSurveyQRModal] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [cafeInfo, setCafeInfo] = useState(null);
  const [firebaseShopId, setFirebaseShopId] = useState(null); // Firebase shops document ID

  const [stats, setStats] = useState({
    totalScore: 0,
    totalCount: 0,
    today: 0,
    weekly: 0
  });

  const [treeType, setTreeType] = useState('init');
  const [treeScore, setTreeScore] = useState(0);
  const [treeForceRegen, setTreeForceRegen] = useState(false);
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
  const inactivityTimerRef = useRef(null);

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


  // action-bar bottom padding and tree-container positioning adjustment
  useEffect(() => {
    const updateTreeLayout = () => {
      const actionBar = document.querySelector('.action-bar');
      const treeSection = document.querySelector('.tree-section');
      const flowContainer = document.querySelector('.flow-container');
      const treeContainer = document.querySelector('.tree-container');

      if (actionBar && treeSection) {
        treeSection.style.paddingBottom = `${actionBar.offsetHeight}px`;
      }

      if (flowContainer && actionBar && treeContainer) {
        const flowRect = flowContainer.getBoundingClientRect();
        const actionBarRect = actionBar.getBoundingClientRect();

        const topPosition = flowRect.bottom;
        const bottomPosition = actionBarRect.top;
        const height = bottomPosition - topPosition;

        // tree-container의 위치와 크기 설정
        treeContainer.style.position = 'fixed';
        treeContainer.style.top = `${topPosition}px`;
        treeContainer.style.left = '0';
        treeContainer.style.width = '100%';
        treeContainer.style.height = `${height}px`;
      }
    };

    const timer = setTimeout(updateTreeLayout, 100);
    window.addEventListener('resize', updateTreeLayout);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTreeLayout);
    };
  }, [cafeInfo]);

  // 비활성 타임아웃: 모달이 열린 상태에서 3분간 입력 없으면 홈 화면 복귀
  const closeAllModals = useCallback(() => {
    setShowVerifyModal(false);
    setShowReturnModal(false);
    setShowDoModal(false);
    setShowHelpModal(false);
    setShowAdminLoginModal(false);
    setShowSettingsModal(false);
    setShowSurveyQRModal(false);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(closeAllModals, INACTIVITY_TIMEOUT);
  }, [closeAllModals]);

  useEffect(() => {
    const isAnyModalOpen =
      showVerifyModal || showReturnModal || showDoModal ||
      showHelpModal || showAdminLoginModal || showSettingsModal || showSurveyQRModal;

    if (!isAnyModalOpen) {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
      return;
    }

    const events = ['touchstart', 'click', 'mousemove', 'keydown'];
    resetInactivityTimer();
    events.forEach(e => window.addEventListener(e, resetInactivityTimer));

    return () => {
      events.forEach(e => window.removeEventListener(e, resetInactivityTimer));
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
        inactivityTimerRef.current = null;
      }
    };
  }, [showVerifyModal, showReturnModal, showDoModal, showHelpModal,
      showAdminLoginModal, showSettingsModal, showSurveyQRModal, resetInactivityTimer]);

  // [음성인식 비활성화] handleWakeWordDetected - wake word 감지 시 도움말 모달 열기
  // const handleWakeWordDetected = useCallback(async (keywordIndex) => {
  //   const isModalOpen = showVerifyModal || showReturnModal || showDoModal || showHelpModal || showSettingsModal || showSurveyQRModal;
  //   if (isModalOpen) return;
  //   setShowHelpModal(true);
  //   try {
  //     const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
  //     await fetch(`${apiBaseUrl}/voice/log-stat`, {
  //       method: 'POST',
  //       headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}`, 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ statType: 'help_modal_opened', metadata: { trigger: 'voice' } })
  //     });
  //   } catch (error) { console.error('통계 기록 실패:', error); }
  // }, [showVerifyModal, showReturnModal, showDoModal, showHelpModal, showSettingsModal, showSurveyQRModal]);

  // [음성인식 비활성화] isAnyModalOpen, 음성 인식 훅 초기화
  // const isAnyModalOpen = showVerifyModal || showReturnModal || showDoModal || showHelpModal || showSettingsModal || showSurveyQRModal;
  // 방법 1: Picovoice
  // const { isListening, error: picoError, hasPermission, requestPermission } =
  //   usePicovoice(!isAnyModalOpen, handleWakeWordDetected);
  // 방법 2: LLM 기반 (GPT-4o-mini-transcribe + Claude)
  // const { isListening, error: picoError, hasPermission, requestPermission, startRecording } =
  //   useVoiceRecognition(!isAnyModalOpen, handleWakeWordDetected, {
  //     segmentDuration: 5000, lowThreshold: 0.4, highThreshold: 0.7,
  //     maxCumulativeDuration: 15000, windowSize: 15000, maxTotalDuration: 30000,
  //     vadThreshold: 10, rmsLogBatchSize: 60,
  //   });

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

    // 화면 표시용 이름 추가 (cafeName은 원본 유지 - Firebase/API용)
    const customCafeName = localStorage.getItem('customCafeName');
    cafe.displayName = customCafeName || cafe.cafeName;

    setCafeInfo(cafe);

    // Firebase shops document ID 조회 (실시간 리스너용)
    const fetchFirebaseShopId = async () => {
      try {
        const shopResult = await getShopByName(cafe.cafeName);
        if (shopResult.success) {
          const shopId = shopResult.data.id;
          setFirebaseShopId(shopId);
          console.log('🔑 Firebase shopId 설정:', shopId);
        } else {
          console.warn('⚠️ Firebase shops에서 카페를 찾을 수 없음:', cafe.cafeName);
        }
      } catch (error) {
        console.error('❌ Firebase shopId 조회 실패:', error);
      }
    };

    fetchFirebaseShopId();
    fetchStats();

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.pathname);
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  // [음성인식 비활성화] 마이크 권한 요청
  // useEffect(() => {
  //   if (!hasPermission) {
  //     requestPermission();
  //   }
  // }, [hasPermission, requestPermission]);

  // [음성인식 비활성화] iOS Safari: 첫 번째 사용자 터치 시 AudioContext 활성화
  // useEffect(() => {
  //   const handleFirstTouch = () => {
  //     if (window.AudioContext || window.webkitAudioContext) {
  //       const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  //       const tempContext = new AudioContextClass();
  //       if (tempContext.state === 'suspended') tempContext.resume();
  //     }
  //     document.removeEventListener('touchstart', handleFirstTouch);
  //     document.removeEventListener('click', handleFirstTouch);
  //   };
  //   document.addEventListener('touchstart', handleFirstTouch, { once: true, passive: true });
  //   document.addEventListener('click', handleFirstTouch, { once: true });
  //   return () => {
  //     document.removeEventListener('touchstart', handleFirstTouch);
  //     document.removeEventListener('click', handleFirstTouch);
  //   };
  // }, []);

  // Firebase 실시간 리스너: QR 적립 즉시 반영
  useEffect(() => {
    if (!firebaseShopId) return;

    console.log('🔥 Firebase 실시간 리스너 시작 (collect_history):', firebaseShopId);

    let isInitialLoad = true; // 초기 로드 플래그

    const q = query(
      collection(db, 'collect_history'),
      where('shop_id', '==', firebaseShopId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // 초기 로드는 무시 (기존 문서들이 모두 'added'로 감지됨)
      if (isInitialLoad) {
        isInitialLoad = false;
        console.log('📚 초기 데이터 로드 완료 (기존 문서 무시)');
        return;
      }

      // 실제 새로운 변경사항만 처리
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // source가 없으면 = bottleclub 앱 QR 반납/실천
          if (!data.source) {
            console.log('✨ bottleclub 앱 QR 반납/실천 감지! 통계 업데이트...');
            fetchStats();

            // ✨ QR 모달이 열려있으면 먼저 닫기
            setShowReturnModal(false);

            // ✨ 가게 나무 grow 신호 전달 (웹 반납과 동일한 패턴)
            // collect_history 문서의 score 필드 사용 (반납: 10, 실천: 5~30)
            // score가 유효한 양수인 경우에만 grow 트리거 (undefined·0 방어)
            const qrScore = data.score;
            if (qrScore > 0) {
              setTreeType('grow');
              setTreeScore(qrScore);
              // 웹 처리와 동일하게 3초 후 init 상태로 복귀
              setTimeout(() => {
                setTreeType('init');
                setTreeScore(0);
              }, 3000);
            }

            // ✨ QR 반납 후 1.5초 뒤 설문 QR 모달 표시 (비활성화)
            // setTimeout(() => {
            //   setShowSurveyQRModal(true);
            // }, 1500);
          }
        }
      });
    }, (error) => {
      console.error('❌ Firebase 리스너 에러 (collect_history):', error);
    });

    return () => {
      console.log('🔥 Firebase 리스너 종료 (collect_history)');
      unsubscribe();
    };
  }, [firebaseShopId]);

  // Firebase 실시간 리스너: QR 대여 즉시 반영
  useEffect(() => {
    if (!firebaseShopId) return;

    console.log('🔥 Firebase 실시간 리스너 시작 (rents):', firebaseShopId);

    let isInitialLoad = true; // 초기 로드 플래그

    const q = query(
      collection(db, 'rents'),
      where('rented_shop_id', '==', firebaseShopId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // 초기 로드는 무시 (기존 문서들이 모두 'added'로 감지됨)
      if (isInitialLoad) {
        isInitialLoad = false;
        console.log('📱 초기 대여 데이터 로드 완료 (기존 문서 무시)');
        return;
      }

      // 실제 새로운 변경사항만 처리
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // source가 'web'이 아니면 = bottleclub 앱 QR 대여
          if (data.source !== 'web') {
            // 대여는 점수 없음 (score=0) → 웹 대여와 동일하게 grow 처리 없음
            console.log('📱 bottleclub 앱 QR 대여 감지! 통계 업데이트... (점수 없음, 반납 시 적립)');
            fetchStats();

            // ✨ QR 모달이 열려있으면 먼저 닫기
            setShowVerifyModal(false);

            // ✨ QR 대여 후 1.5초 뒤 설문 QR 모달 표시 (비활성화)
            // setTimeout(() => {
            //   setShowSurveyQRModal(true);
            // }, 1500);
          }
        }
      });
    }, (error) => {
      console.error('❌ Firebase 리스너 에러 (rents):', error);
    });

    return () => {
      console.log('🔥 Firebase 리스너 종료 (rents)');
      unsubscribe();
    };
  }, [firebaseShopId]);

  const fetchStats = async () => {
    try {
      const data = await getMyStats();
      setStats(data);
    } catch (error) {
      console.error('통계 불러오기 실패:', error);
    }
  };

  // 나무 재생성: TreeContainer의 forceRegen prop을 트리거하여 iframe 리로드 후 새 배치 생성
  // (직접 postMessage 방식은 기존 Three.js pool이 초기화되지 않아 나무가 누적되는 문제 발생)
  const handleTreeRegenerate = () => {
    setTreeForceRegen(true);
    // TreeContainer의 forceRegen useEffect 실행 후 플래그 리셋 (다음 재생성을 위해)
    setTimeout(() => setTreeForceRegen(false), 200);
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
    setTreeScore(0); // 대여 시 보틀 적립 없음 (반납 시 지급)
    fetchStats();
    setTimeout(() => {
      setTreeType('init');
      setTreeScore(0);
    }, 3000);

    // 스낵바 종료 후 1.5초 후 설문 QR 모달 표시 (비활성화)
    // setTimeout(() => {
    //   setShowSurveyQRModal(true);
    // }, 1500);
  };

  const handleReturnSuccess = (score) => {
    setSnackbarMessage('🌱 반납이 완료되었습니다');
    setShowSuccessSnackbar(true);
    setTreeType('grow');
    setTreeScore(score || 0); // 실제 반납 점수 (컵 수 × 10)
    fetchStats();
    setTimeout(() => {
      setTreeType('init');
      setTreeScore(0);
    }, 3000);

    // 스낵바 종료 후 1.5초 후 설문 QR 모달 표시 (비활성화)
    // setTimeout(() => {
    //   setShowSurveyQRModal(true);
    // }, 1500);
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

    // 스낵바 종료 후 1.5초 후 설문 QR 모달 표시 (비활성화)
    // setTimeout(() => {
    //   setShowSurveyQRModal(true);
    // }, 1500);
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
          <h1 className="cafe-name">{cafeInfo.displayName || cafeInfo.cafeName}</h1>
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
        onClick={() => setShowAdminLoginModal(true)}
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
          forceRegen={treeForceRegen}
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
        <HelpModal
          onClose={() => {
            setShowHelpModal(false);
            // [음성인식 비활성화] 도움말 닫으면 음성인식 재시작
            // setTimeout(() => { if (startRecording) startRecording(); }, 500);
          }}
          onUseButtonClick={handleBorrowCupAction}
        />
      }

      {/* Admin Login Modal (설정 접근용) */}
      {showAdminLoginModal && (
        <AdminLogin
          onClose={() => setShowAdminLoginModal(false)}
          onLoginSuccess={() => {
            setShowAdminLoginModal(false);
            setShowSettingsModal(true);
          }}
          forSettings={true}
          currentCafeId={cafeInfo?.id}
        />
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          onCafeNameChange={(newName) => {
            // 화면 표시용 이름만 변경 (cafeName은 원본 유지)
            setCafeInfo(prev => ({
              ...prev,
              displayName: newName
            }));
          }}
          onTreeRegenerate={handleTreeRegenerate}
        />
      )}

      {showSuccessSnackbar && (
        <SuccessSnackbar
          message={snackbarMessage}
          onClose={() => setShowSuccessSnackbar(false)}
          duration={800}
        />
      )}

      {/* 설문 QR 모달 (비활성화) */}
      {/* {showSurveyQRModal && (
        <SurveyQRModal
          onClose={() => setShowSurveyQRModal(false)}
          autoCloseDuration={15000}
        />
      )} */}
    </div>
  );
}

export default HomeScreen;
