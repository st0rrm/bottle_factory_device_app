import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import maskCupIcon from '../assets/images/mask_cup.svg';
import './QRCodeView.css';
import { getShopByName } from '../firebase/firestore';

export default function QRCodeView({ title = '리턴미컵 대여를 위해', mode = 'rental' }) {
  // mode: 'rental' | 'return' | 'action' (실천 모드)
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
        const cafeName = cafeData.cafeName;

        // Firebase에서 카페명으로 가게 정보 조회
        const shopResult = await getShopByName(cafeName);

        if (shopResult.success && shopResult.data.id) {
          // QR 코드 값은 shops 문서 ID (앱에서 shops/{id}로 조회)
          setQrValue(shopResult.data.id);
          console.log('✅ QR 코드 생성 완료 (카페명:', cafeName, ', Shop ID:', shopResult.data.id, ')');
        } else {
          console.error('가게 정보를 찾을 수 없습니다. 카페명:', cafeName);
          setQrValue('ERROR');
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
          ) : qrValue === 'ERROR' ? (
            <div className="qr-error">
              <div className="qr-error-icon">⚠️</div>
              <div className="qr-error-message">
                QR 코드를 생성할 수 없습니다
                <br />
                <span className="qr-error-detail">
                  Firebase에 등록된 카페 정보를 찾을 수 없습니다
                </span>
              </div>
            </div>
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
            {mode === 'action' ? (
              <p className="instruction-text">왼쪽으로 스와이프해 보틀 적립 탭 전환</p>
            ) : (
              <div className="instruction-with-icon">
                <p className="instruction-text">좌측 하단에서</p>
                <div className="pause-icon-container">
                  <img src={maskCupIcon} alt="Cup Icon" className="pause-icon" />
                </div>
                <p className="instruction-text">터치</p>
              </div>
            )}
          </div>
          <div className="instruction-item">
            <div className="instruction-bullet" />
            <p className="instruction-text">
              {mode === 'action'
                ? '행동 선택 후 적립하기 누르기'
                : `[${mode === 'rental' ? '대여' : '반납'}] 선택 후 ${mode === 'rental' ? '대여할' : '반납할'} 컵 선택`
              }
            </p>
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
