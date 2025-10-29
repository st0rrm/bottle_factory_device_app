import React, { useState } from 'react';
import './home.css';
import VerifyModal from '../../components/VerifyModal';
import ReturnModal from '../../components/ReturnModal';
import helpIcon from '../../assets/images/help.svg';

function HomeScreen() {
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  const handleBorrowCupAction = () => {
    setShowVerifyModal(true);
  };

  const handleReturnCupAction = () => {
    setShowReturnModal(true);
  };

  const handleHelpAction = () => {
    console.log('도움말 버튼 클릭됨');
  };

  return (
    <div className="home-container">
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

      {/* Bottom Action Bar */}
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
          <div className="help-section" onClick={handleHelpAction}>
            <img src={helpIcon} alt="Help" className="help-image" />
          </div>
        </div>
      </div>

      {/* Modals */}
      {showVerifyModal && <VerifyModal onClose={() => setShowVerifyModal(false)} />}
      {showReturnModal && <ReturnModal onClose={() => setShowReturnModal(false)} />}
    </div>
  );
}

export default HomeScreen;
