import React, { useState } from 'react';
import './HelpModal.css';

// ⚠️ 이미지 파일 이름은 예시입니다. 실제 파일 이름으로 대체하세요.
import birdImage from '../assets/images/bird_recommendation.svg';
import step1Icon from '../assets/images/1_recommendation_how.svg';
import step2Icon from '../assets/images/2_recommendation_how.svg';
import step3Icon from '../assets/images/1_recommendation_how.svg';
import xIcon from '../assets/images/x_icon.svg';
import returnmecupimg from '../assets/images/1_recommendation_what.jpg';

export default function HelpModal({ onClose, onUseButtonClick }) {
  const [activeTab, setActiveTab] = useState('howToUse'); // 'whatIsIt' 또는 'howToUse'

  const whatIsItContent = (
    <div className="modal-content-placeholder">
      <div className="image-area">
        <img src={returnmecupimg} alt="컵 도움말 이미지" className="content-image"/>
      </div>
      <p>테이크-아웃할 때 일회용컵 외의 선택지가 있는 카페문화가 일상화되기를 원합니다. </p>
      <p>리턴미컵은 일회용컵을 대체할 수 있도록 기능과 형태 모두를 고려해 디자인된 컵입니다.</p>
    </div>
  );

  const howToUseContent = (
    <div className="how-to-use-steps">
      <div className="step-item">
        <div className="step-icon-wrapper">
          <img src={step1Icon} alt="1단계 아이콘: 컵 빌리기" className="step-icon" />
        </div>
        <p className="step-text">전화번호를 통해 간편히 <br /> 리턴미컵을 빌려요.</p>
      </div>
      <div className="step-item">
        <div className="step-icon-wrapper">
          <img src={step2Icon} alt="2단계 아이콘: 음료 담아가기" className="step-icon" />
        </div>
        <p className="step-text">세척된 리턴미컵에 <br /> 음료를 담아가요.</p>
      </div>
      <div className="step-item">
        <div className="step-icon-wrapper">
          <img src={step3Icon} alt="3단계 아이콘: 컵 반납하기" className="step-icon" />
        </div>
        <p className="step-text">리턴미컵을 물에 한번 헹궈 <br /> 빌린 가게에 반납해요.</p>
      </div>
    </div>
  );

  return (
    <div className="help-modal-overlay" onClick={onClose}>
      <div className="help-modal-content" onClick={e => e.stopPropagation()}>

        {/* 닫기 버튼 */}
        <button className="close-button" onClick={onClose} aria-label="닫기">
          <img src={xIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
        </button>

        {/* 카드 영역 */}
        <div className="modal-card">
          {/* 🔹 여기로 이동한 새 + 말풍선 영역 */}
          <div className="header-message-area">
            <img
              src={birdImage}
              alt="지구를 위한 선택을 권유하는 새"
              className="bird-image"
            />
            <div className="speech-bubble">
              <p className="bubble-text">
                <span className="bold-choice">지구를 위한 선택!</span> 일회용 컵 대신
                <br />
                <strong className="cup-name">리턴미컵</strong> 어떠세요?
              </p>
            </div>
          </div>

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
            <button
              className="use-button"
              onClick={() => {
                onClose();
                if (onUseButtonClick) onUseButtonClick();
              }}
            >
              리턴미컵 사용할래요
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}