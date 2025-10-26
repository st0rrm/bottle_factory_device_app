// src/components/StatDisplay.jsx

import React from 'react';
import './StatDisplay.css';
import WateringIcon from '../../../assets/images/wateringcan.svg';
function StatDisplay({ stats }) {
    return (
        // 💡 최상위 div.stat-container를 제거하고 React Fragment로 대체
        <>
            {/* 카페 이름 */}
            <div className="cafe-name">{stats.cafeName}</div>
            
            {/* 1. 누적 적립 횟수 */}
            {/* ⚠️ 참고: 이 항목에 '누적 적립 횟수' 라벨 텍스트가 없습니다. */}
            
            <div className="total-accumulated-stat">
                {stats.totalAccumulated}
            </div>

            <img 
                    src={WateringIcon} 
                    alt="물 아이콘" 
                    className="watering-icon" 
                />
            
            {/* 2. 오늘/주간 (가로로 나란히) */}
            <div className="daily-weekly-row">
                {/* 오늘 */}
                <div className="stat-item daily-stat">
                    <span className="stat-label">오늘</span>
                    <span className="stat-value">{stats.dailyAccumulated}</span>
                    <span className="stat-label">회</span>
                </div>
                {/* 주간 */}
                <div className="stat-item weekly-stat">
                    <span className="stat-label">주간</span>
                    <span className="stat-value">{stats.weeklyAccumulated}</span>
                    <span className="stat-label">회</span>
                </div>
            </div>
        </>
        // ⚠️ 주의: JSX가 항상 하나의 요소만 반환해야 한다는 규칙 때문에 Fragment 사용.
    );
}

export default StatDisplay;