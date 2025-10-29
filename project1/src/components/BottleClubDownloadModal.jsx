import React from 'react';
import './BottleClubDownloadModal.css';
import xIcon from '../assets/images/x_icon.svg';

export default function BottleClubDownloadModal({ onClose }) {
  return (
    <div className="bottle-club-modal-overlay">
      <div className="bottle-club-modal-container">
        {/* Close Button */}
        <button onClick={onClose} className="bottle-club-close-button">
          <img src={xIcon} alt="닫기" style={{ width: '24px', height: '24px' }} />
        </button>

        {/* Title */}
        <h2 className="bottle-club-title">보틀클럽 다운로드</h2>

        {/* QR Code */}
        <div className="qr-code-container">
          <div className="qr-code-box">
            <img src="/bottle-club-app-qr-code.jpg" alt="Bottle Club QR Code" className="qr-code-image" />
          </div>
        </div>

        {/* Description Text */}
        <p className="bottle-club-description">
          보틀클럽은 앱스토어에서 검색하거나,
          <br />위 QR 코드를 스캔해 간편하게 다운로드할 수 있습니다.
        </p>

        {/* Illustration */}
        <div className="bottle-club-illustration">
          <div className="illustration-container">
            {/* Orange circle (sun) */}
            <div className="sun-circle" />

            {/* Green plant */}
            <div className="plant-svg-container">
              <svg width="60" height="80" viewBox="0 0 60 80" fill="none">
                <path d="M30 80 L30 40" stroke="#478a81" strokeWidth="3" />
                <ellipse cx="20" cy="30" rx="8" ry="15" fill="#4ac295" />
                <ellipse cx="25" cy="25" rx="7" ry="13" fill="#4ac295" />
                <ellipse cx="30" cy="22" rx="6" ry="12" fill="#4ac295" />
                <ellipse cx="35" cy="25" rx="7" ry="13" fill="#4ac295" />
                <ellipse cx="40" cy="30" rx="8" ry="15" fill="#4ac295" />
              </svg>
            </div>

            {/* Books/Laptop */}
            <div className="books-container">
              <div className="book-top" />
              <div className="book-bottom" />
            </div>

            {/* Coffee Cup */}
            <div className="illustration-cup-container">
              <div className="illustration-cup-wrapper">
                {/* Cup body */}
                <div className="illustration-cup-body">
                  <div className="illustration-cup-label">Return Me</div>
                  {/* Cup shine effect */}
                  <div className="illustration-cup-shine" />
                </div>
                {/* Cup lid */}
                <div className="illustration-cup-lid-top" />
                <div className="illustration-cup-lid-bottom" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
