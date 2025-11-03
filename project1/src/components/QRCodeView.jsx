import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import maskCupIcon from '../assets/images/mask_cup.svg';
import './QRCodeView.css';
import { getShopData } from '../firebase/firestore';

export default function QRCodeView({ title = '리턴미컵 대여를 위해', mode = 'rental' }) {
  const [qrValue, setQrValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadShopQR = async () => {
      try {
        // 로그인한 카페 정보 가져오기
        const userData = localStorage.getItem('userData');
        if (!userData) {
          console.error('카페 정보를 찾을 수 없습니다.');
          setQrValue('ERROR');
          setIsLoading(false);
          return;
        }

        const cafeData = JSON.parse(userData);
        const shopId = cafeData.cafeId;

        // Firebase에서 카페 정보 조회
        const shopResult = await getShopData(shopId);

        if (shopResult.success && shopResult.data.pin) {
          setQrValue(shopResult.data.pin);
          console.log('✅ QR 코드 생성 완료:', shopResult.data.pin);
        } else {
          console.error('가게 PIN을 찾을 수 없습니다.');
          setQrValue(shopId); // 대체값으로 shopId 사용
        }
      } catch (error) {
        console.error('QR 코드 로드 실패:', error);
        setQrValue('ERROR');
      } finally {
        setIsLoading(false);
      }
    };

    loadShopQR();
  }, []);

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
          {isLoading ? (
            <div className="qr-loading">로딩 중...</div>
          ) : (
            <QRCodeSVG
              value={qrValue}
              size={256}
              level="H"
              includeMargin={true}
              className="qr-scanner-box"
            />
          )}
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
                <img src={maskCupIcon} alt="Cup Icon" className="pause-icon" />
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
