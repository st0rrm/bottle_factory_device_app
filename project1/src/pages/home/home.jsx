import React, { useState } from 'react';
import './home.css';
import VerifyModal from '../../components/VerifyModal';
import ReturnModal from '../../components/ReturnModal';
import helpIcon from '../../assets/images/help.svg';
import HelpModal from '../../components/HelpModal';

function HomeScreen() {
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleBorrowCupAction = () => {
    setShowVerifyModal(true);
  };

  const handleReturnCupAction = () => {
    setShowReturnModal(true);
  };

  const handleHelpAction = () => {
    setShowHelpModal(true);
  };

  // 💡 모달이 열려 있는지 확인하는 단일 변수
  const isModalOpen = showVerifyModal || showReturnModal || showHelpModal;

  return (
    <div className="home-container">
      {/* ------------------------------------------------------------- */}
      {/* 1. 모달이 열려 있지 않을 때만 상단 콘텐츠 (Header + Tree) 렌더링 */}
      {/* ------------------------------------------------------------- */}
      {!isModalOpen && (
        <>
          {/* Header Section */}
          <div className="header-section">
            <h1 className="cafe-name">커피포임팩트</h1>
            <div className="total-count">
              <svg className="droplet-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
              </svg>
              <span className="count-number">123</span>
            </div>
            <p className="sub-stats">
              오늘 <span className="stat-value">12</span>회 | 주간 <span className="stat-value">34</span>회
            </p>
          </div>

          {/* Tree Illustration Section - Placeholder for background image */}
          <div className="tree-section">
            {/* Background image will be added here */}
          </div>
        </>
      )}

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