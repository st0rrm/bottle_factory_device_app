import React, { useEffect } from 'react';
import './SurveyQRModal.css';
import surveyQRImage from '../assets/images/survey_qr.png';
import xIcon from '../assets/images/x_icon.svg';

export default function SurveyQRModal({ onClose, autoCloseDuration = 20000 }) {
  // 자동 닫기 타이머
  useEffect(() => {
    if (autoCloseDuration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDuration);

      return () => clearTimeout(timer);
    }
  }, [autoCloseDuration, onClose]);

  return (
    <div className="survey-modal-overlay" onClick={onClose}>
      <div className="survey-modal-content" onClick={e => e.stopPropagation()}>

        {/* 닫기 버튼 */}
        <button className="survey-close-button" onClick={onClose} aria-label="닫기">
          <img src={xIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
        </button>

        {/* 메인 카드 */}
        <div className="survey-modal-card">
          {/* QR 코드 영역 */}
          <div className="survey-qr-container">
            <img
              src={surveyQRImage}
              alt="설문조사 QR 코드"
              className="survey-qr-image"
            />
          </div>

          {/* 메시지 영역 */}
          <div className="survey-message-area">
            <p className="survey-description">
              보틀팩토리 디바이스 이용 경험을 공유해주시면
              <br />
              더 나은 서비스를 만드는 데 큰 도움이 됩니다.
            </p>
            <p className="survey-sub-description">
              QR 코드를 스캔하여 설문에 참여해주세요!
              <br />
              설문에 참여해주시면 감사의 의미를 담아 소정의 상품을 드립니다.
            </p>
          </div>

          {/* 하단 버튼 */}
          <div className="survey-button-area">
            <button className="survey-close-btn" onClick={onClose}>
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
