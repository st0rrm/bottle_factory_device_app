import React, { useState } from 'react';
import './HelpModal.css';

// ⚠️ 이미지 파일 이름은 예시입니다. 실제 파일 이름으로 대체하세요.
import birdImage from '../assets/images/bird_recommendation.svg';
import step1Icon from '../assets/images/1_recommendation_how.svg';
import step2Icon from '../assets/images/2_recommendation_how.svg';
import step3Icon from '../assets/images/1_recommendation_how.svg';
import xIcon from '../assets/images/x_icon.svg';

export default function HelpModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('howToUse'); // 'whatIsIt' 또는 'howToUse'

  const whatIsItContent = (
    <div className="modal-content-placeholder">
      <p>리턴미컵은 환경을 생각하는 당신을 위한 다회용 컵 대여 서비스입니다.</p>
      <p>일회용 컵 사용을 줄이고, 지구를 위한 작은 습관을 시작해 보세요.</p>
    </div>
  );

  const howToUseContent = (
    <div className="how-to-use-steps">
      <div className="step-item">
        <div className="step-icon-wrapper">
          <img src={step1Icon} alt="1단계 아이콘: 컵 빌리기" className="step-icon" />
        </div>
        <p className="step-text">전화번호를 통해 간편히 <br/> 리턴미컵을 빌려요.</p>
      </div>
      <div className="step-item">
        <div className="step-icon-wrapper">
          <img src={step2Icon} alt="2단계 아이콘: 음료 담아가기" className="step-icon" />
        </div>
        <p className="step-text">세척된 리턴미컵에 <br/> 음료를 담아가요.</p>
      </div>
      <div className="step-item">
        <div className="step-icon-wrapper">
          <img src={step3Icon} alt="3단계 아이콘: 컵 반납하기" className="step-icon" />
        </div>
        <p className="step-text">리턴미컵을 물에 한번 헹궈 <br/> 빌린 가게에 반납해요.</p>
      </div>
    </div>
  );

  return (
    // 모달 오버레이 (화면 전체를 덮음)
    <div className="help-modal-overlay" onClick={onClose}>
        {/* 새 이미지 및 말풍선 */}
        <div className="header-message-area">
            <img src={birdImage} alt="지구를 위한 선택을 권유하는 새" className="bird-image" />
            <div className="speech-bubble">
            <p className="bubble-text">
                <span className="bold-choice">지구를 위한 선택!</span> 일회용 컵 대신
                <br />
                <strong className="cup-name">리턴미컵</strong> 어떠세요?
            </p>
            </div>
        </div>
      {/* 모달 콘텐츠 (오버레이 클릭 시 닫히는 것을 방지) */}
      <div className="help-modal-content" onClick={e => e.stopPropagation()}>
        
        {/* 닫기 버튼 (X 표시) */}
        <button className="close-button" onClick={onClose} aria-label="닫기">
          <img src={xIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
        </button>

        

        {/* 카드 영역 */}
        <div className="modal-card">
          
          {/* 탭 네비게이션 */}
          <div className="tab-navigation">
            <button
              className={`tab-button ${activeTab === 'whatIsIt' ? 'active' : ''}`}
              onClick={() => setActiveTab('whatIsIt')}
            >
              리턴미컵이 무엇인가요?
            </button>
            <button
              className={`tab-button ${activeTab === 'howToUse' ? 'active' : ''}`}
              onClick={() => setActiveTab('howToUse')}
            >
              어떻게 사용하나요?
            </button>
          </div>

          {/* 탭 콘텐츠 */}
          <div className="tab-content">
            {activeTab === 'whatIsIt' ? whatIsItContent : howToUseContent}
          </div>
          
          {/* 하단 버튼 영역 */}
          <div className="button-area">
            <button className="later-button" onClick={onClose}>
              나중에
            </button>
            <button className="use-button" onClick={onClose}>
              리턴미컵 사용할래요
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}