import React, { useState } from 'react';
import './RewardsInfoModal.css';

export default function RewardsInfoModal({ onClose }) {
  const [currentPage, setCurrentPage] = useState(1);

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < 3) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="rewards-modal-overlay-wrapper">
      {/* Dimmed background overlay */}
      <div className="rewards-modal-background" onClick={onClose} />

      {/* Modal content */}
      <div className="rewards-modal-content-container">
        {/* Header */}
        <div className="rewards-modal-header">
          <h2 className="rewards-modal-title">보상</h2>
          <button onClick={onClose} className="rewards-close-button">
            <svg className="rewards-close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2" strokeLinecap="round" />
              <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Page Content */}
        <div className="rewards-page-content">
          {/* Page 1 */}
          {currentPage === 1 && (
            <div className="rewards-page-section">
              <p className="rewards-description-text">
                리턴미컵 대여 및 반납 시{' '}
                <span className="bottle-badge">
                  <svg className="bottle-icon-inline" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                  보틀
                </span>
                을 받습니다.
              </p>
              <p className="rewards-description-text">
                보틀은 다회용컵 대여 등 일상 속 친환경 실천을 통해 적립할 수 있는 점수입니다.
              </p>

              {/* Illustration */}
              <div className="rewards-illustration-container">
                <img
                  src="/hand-holding-phone-with-bottle-points-and-green-pl.jpg"
                  alt="보틀 적립 일러스트"
                  className="rewards-illustration-image"
                />
              </div>
            </div>
          )}

          {/* Page 2 */}
          {currentPage === 2 && (
            <div className="rewards-page-section">
              <p className="rewards-description-text">
                적립한 보틀은 다양한 상품과 프로그램을 구입할 때 사용할 수 있습니다.
              </p>

              {/* Rewards Grid */}
              <div className="rewards-grid">
                {/* Reward Item 1 */}
                <div className="reward-item">
                  <img
                    src="/americano-coffee-cup.jpg"
                    alt="아메리카노"
                    className="reward-item-image"
                  />
                  <h3 className="reward-item-title">아메리카노 1잔</h3>
                  <p className="reward-item-points">300 보틀</p>
                  <p className="reward-item-store">버터앤커피</p>
                </div>

                {/* Reward Item 2 */}
                <div className="reward-item">
                  <img
                    src="/ugly-hot-craft-making.jpg"
                    alt="어글리핫"
                    className="reward-item-image"
                  />
                  <h3 className="reward-item-title">어글리핫 만들기</h3>
                  <p className="reward-item-points">100 보틀</p>
                </div>

                {/* Reward Item 3 */}
                <div className="reward-item">
                  <img
                    src="/yoga-class-exercise.jpg"
                    alt="요가 클래스"
                    className="reward-item-image"
                  />
                  <h3 className="reward-item-title">요가 클래스</h3>
                  <p className="reward-item-points">200 보틀</p>
                </div>

                {/* Reward Item 4 */}
                <div className="reward-item">
                  <img
                    src="/and-now-book-cover.jpg"
                    alt="앤드 나우 책"
                    className="reward-item-image"
                  />
                  <h3 className="reward-item-title">『앤드 나우』책 한 권</h3>
                  <p className="reward-item-points">300 보틀</p>
                  <p className="reward-item-store">달빛서재</p>
                </div>

                {/* Reward Item 5 */}
                <div className="reward-item">
                  <img
                    src="/bakery-croissant-pastry.jpg"
                    alt="베이커리"
                    className="reward-item-image"
                  />
                  <h3 className="reward-item-title">베이커리류 1개 교환권</h3>
                  <p className="reward-item-points">100 보틀</p>
                  <p className="reward-item-store">달콤상점</p>
                </div>

                {/* Reward Item 6 */}
                <div className="reward-item">
                  <img
                    src="/ansan-mountain-walking-guide.jpg"
                    alt="안산 산책"
                    className="reward-item-image"
                  />
                  <h3 className="reward-item-title">안산 산책 가이드</h3>
                  <p className="reward-item-points">100 보틀</p>
                </div>

                {/* Reward Item 7 */}
                <div className="reward-item">
                  <img
                    src="/ollo-50-percent-coupon.jpg"
                    alt="올로 쿠폰"
                    className="reward-item-image"
                  />
                  <h3 className="reward-item-title">올로 50% 쿠폰</h3>
                  <p className="reward-item-points">400 보틀</p>
                  <p className="reward-item-store">라벤더팩토리</p>
                </div>

                {/* Reward Item 8 */}
                <div className="reward-item">
                  <img
                    src="/scrap-paper-notebook-making.jpg"
                    alt="이면지 노트"
                    className="reward-item-image"
                  />
                  <h3 className="reward-item-title">이면지 노트 만들기</h3>
                  <p className="reward-item-points">100 보틀</p>
                </div>
              </div>
            </div>
          )}

          {/* Page 3 */}
          {currentPage === 3 && (
            <div className="rewards-page-section">
              <p className="rewards-description-text">
                <span className="bottle-club-link">보틀클럽</span> 앱에서 보틀 내역을 확인하고
                사용하며, 더 다양한 적립 방법도 알아볼 수 있습니다.
              </p>

              {/* QR Code */}
              <div className="rewards-qr-container">
                <div className="rewards-qr-box">
                  <img
                    src="/qr-code-black-and-white.jpg"
                    alt="보틀클럽 QR 코드"
                    className="rewards-qr-image"
                  />
                </div>
              </div>

              <p className="rewards-download-text">
                보틀클럽은 앱스토어에서 검색하거나,
                <br />위 QR 코드를 스캔해 간편하게 다운로드할 수 있습니다.
              </p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="rewards-navigation">
          <button
            onClick={goToPrevPage}
            disabled={currentPage === 1}
            className={`nav-button ${currentPage === 1 ? 'nav-button-disabled' : 'nav-button-active'}`}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="15 18 9 12 15 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <span className="page-indicator">{currentPage}/3</span>

          <button
            onClick={goToNextPage}
            disabled={currentPage === 3}
            className={`nav-button ${currentPage === 3 ? 'nav-button-disabled' : 'nav-button-active'}`}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <polyline points="9 18 15 12 9 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
