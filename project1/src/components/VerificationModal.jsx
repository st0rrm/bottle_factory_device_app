// src/components/VerificationModal.js

import React, { useState } from 'react';
import './VerificationModal.css';

// 키패드 버튼
const KeypadButton = ({ value, onClick }) => (
    <button className="keypad-btn" onClick={() => onClick(value)}>
        {value}
    </button>
);

function VerificationModal({ onClose }) {
    // 모달 내부 상태: 'phone' 또는 'qr'
    const [mode, setMode] = useState('phone'); 
    // 전화번호 입력 값 (예시: 0101234)
    const [phoneNumber, setPhoneNumber] = useState(''); 

    // 키패드 입력 처리
    const handleKeypadInput = (key) => {
        if (key === '확인') {
            console.log('전화번호 확인:', phoneNumber);
            // 여기에 본인 확인 API 호출 로직을 추가합니다.
            // 성공 시 onClose() 호출하여 모달 닫기
            alert(`입력된 번호: ${phoneNumber}. 확인 로직을 진행합니다.`);
        } else if (key === '지우기') {
            setPhoneNumber(prev => prev.slice(0, -1)); // 마지막 숫자 제거
        } else if (phoneNumber.length < 11) { // 최대 11자리 제한 (010-xxxx-yyyy)
            setPhoneNumber(prev => prev + key);
        }
    };
    
    // 키패드 구성
    const keys = [
        '1', '2', '3', 
        '4', '5', '6', 
        '7', '8', '9', 
        '지우기', '0', '확인'
    ];

    // 전화번호 입력 화면 렌더링
    const renderPhoneMode = () => (
        <>
            <div className="input-display">
                <p className="placeholder">{phoneNumber || '전화번호'}</p>
            </div>
            <p className="instruction-text">리턴미컵 대여를 위해 전화번호를 입력해 주세요.</p>
            <div className="keypad-grid">
                {keys.map(key => (
                    <KeypadButton 
                        key={key} 
                        value={key} 
                        onClick={handleKeypadInput}
                    />
                ))}
            </div>
        </>
    );

    // QR 코드 인식 화면 렌더링
    const renderQrMode = () => (
        <>
            <div className="qr-image-container">
                {/* 🚨 qrcode.png 파일 경로는 프로젝트 구조에 맞게 수정해야 합니다. */}
                <img src="../qrcode/qr.png" alt="QR 코드 인식 영역" className="qr-image" />
            </div>
            <p className="instruction-text">스캐너에 QR 코드를 인식시켜 주세요.</p>
            <div className="usage-guide">
                <p><strong>사용 방법:</strong></p>
                <ul>
                    <li>1. 휴대폰 앱에서 QR 코드를 실행합니다.</li>
                    <li>2. 화면의 스캐너 영역에 QR 코드를 가져다 댑니다.</li>
                    <li>3. 자동으로 인식되어 본인 확인이 완료됩니다.</li>
                </ul>
            </div>
        </>
    );

    return (
        // 모달 배경 (어두운 오버레이)
        <div className="modal-overlay" onClick={onClose}>
            {/* 모달 창 (배경 클릭 시 닫히지 않도록 이벤트 전파 중단) */}
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                
                {/* 1. 상단 모드 전환 버튼 */}
                <div className="mode-toggle-group">
                    <button 
                        className={`mode-btn ${mode === 'phone' ? 'active' : ''}`}
                        onClick={() => setMode('phone')}
                    >
                        전화번호
                    </button>
                    <button 
                        className={`mode-btn ${mode === 'qr' ? 'active' : ''}`}
                        onClick={() => setMode('qr')}
                    >
                        QR 코드
                    </button>
                </div>
                
                {/* 2. 모드별 콘텐츠 */}
                <div className="mode-content-area">
                    {mode === 'phone' ? renderPhoneMode() : renderQrMode()}
                </div>
            </div>
        </div>
    );
}

export default VerificationModal;