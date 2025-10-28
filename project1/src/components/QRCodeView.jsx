import React from 'react';
import './QRCodeView.css';

export default function QRCodeView({ title = '리턴미컵 대여를 위해', mode = 'rental' }) {
  return (
    <div className="qr-code-view">
      {/* Title */}
      <div className="qr-title">
        <p className="qr-heading-combined">
          {title}
          <br />
          <span className="qr-subheading-text">보틀클럽</span> 앱을 실행해주세요
        </p>
      </div>

      {/* Content Wrapper for horizontal layout on short screens */}
      <div className="qr-content-wrapper">
        {/* QR Code Scanner Placeholder */}
        <div className="qr-scanner-container">
          <div className="qr-scanner-box" />
        </div>

        {/* Instructions */}
        <div className="qr-instructions">
          <div className="instruction-item">
            <div className="instruction-bullet" />
            <p className="instruction-text">보틀클럽 실행</p>
          </div>
          <div className="instruction-item">
            <div className="instruction-bullet" />
            <div className="instruction-with-icon">
              <p className="instruction-text">좌측 하단에서</p>
              <div className="pause-icon-container">
                <svg className="pause-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <rect x="6" y="4" width="4" height="16" fill="currentColor" />
                  <rect x="14" y="4" width="4" height="16" fill="currentColor" />
                </svg>
              </div>
              <p className="instruction-text">터치</p>
            </div>
          </div>
          <div className="instruction-item">
            <div className="instruction-bullet" />
            <p className="instruction-text">[{mode === 'rental' ? '대여' : '반납'}] 선택 후 {mode === 'rental' ? '대여할' : '반납할'} 컵 선택</p>
          </div>
          <div className="instruction-item">
            <div className="instruction-bullet" />
            <p className="instruction-text">위 QR코드 스캔</p>
          </div>
        </div>
      </div>
    </div>
  );
}
