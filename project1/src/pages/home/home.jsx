import React, { useState } from 'react';
import './home.css';
import VerificationModal from '../../components/VerificationModal';
import StatDisplay from '../../components/StatDisplay';
import TreeImage from '../../components/TreeImage';


function HomeScreen() {
  // ... (stats 상태는 동일)
  const [stats, setStats] = useState({
    cafeName: '커피포임팩트',
    totalAccumulated: 25,
    dailyAccumulated: 2,
    weeklyAccumulated: 8,
  });

  const [isModalOpen, setIsModalOpen] = useState(false); 

  // 대여 버튼 핸들러 모달 열기
  const handleBorrowCupAction = () => {
    // console.log('리턴미컵 대여 버튼 클릭됨. 로직 처리 필요');
    setIsModalOpen(true); // 🌟 모달 열기 / identification으로 넘어감
  };
  
  const handleReturnCupAction = () => { // 🌟 반납 기능 분리 🌟
    console.log('리턴미컵 반납 버튼 클릭됨. 로직 처리 필요');
  };

  const handleHelpAction = () => {
    console.log('도움말 버튼 클릭됨. 도움말 화면으로 이동 처리 필요');
  };

  return (
    <div className="home-container">
      {/* 1. 화면 좌상단 통계 정보 */}
      <StatDisplay stats={stats} />

      {/* 2. 화면 중앙 나무 이미지 */}
      <div className="tree-area">
        <TreeImage totalAccumulated={stats.totalAccumulated} />
      </div>

      {/* 3. 화면 하단 버튼 세 개 (구조 변경) */}
      <div className="button-area">
          
          {/* 🌟 새로 추가: 대여/반납 버튼을 묶는 컨테이너 🌟 */}
          <div className="main-action-group">
              {/* 대여 버튼 (왼쪽) */}
              <button
                className="borrow-button" // 클래스 이름 변경
                onClick={handleBorrowCupAction}
              >
                대여
              </button>

              {/* 반납 버튼 (오른쪽) */}
              <button
                className="return-button" // 클래스 이름 변경
                onClick={handleReturnCupAction}
              >
                반납
              </button>
          </div>

          {/* 도움말 버튼 (가장 오른쪽) */}
          <button
            className="help-button"
            onClick={handleHelpAction}
          >
          </button>
      </div>
      {/* 🌟 4. 모달 조건부 렌더링 🌟 */}
      {isModalOpen && (
          <VerificationModal 
              onClose={() => setIsModalOpen(false)} // 닫기 함수 전달
          />
      )}
    </div>
  );
}

export default HomeScreen;