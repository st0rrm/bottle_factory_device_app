import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CafeStats.css';
import { getMyDailyStats } from '../../api/behaviors';
import { getMyStats } from '../../api/statistics';

function CafeStats() {
  const navigate = useNavigate();
  const [cafeInfo, setCafeInfo] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [transactionStats, setTransactionStats] = useState({ total: 0, today: 0, weekly: 0 });
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    // 카페 인증 확인
    const userData = localStorage.getItem('userData');
    const userType = localStorage.getItem('userType');
    const authToken = localStorage.getItem('authToken');

    console.log('CafeStats 인증 체크:', {
      userData: userData ? 'exists' : 'missing',
      userType,
      authToken: authToken ? 'exists' : 'missing'
    });

    if (!userData || !authToken || (userType !== 'cafe' && userType !== 'cafe_stats')) {
      console.log('인증 실패 - 로그인 페이지로 리디렉션');
      navigate('/login', { replace: true });
      return;
    }

    console.log('인증 성공 - 통계 로드 시작');
    const cafe = JSON.parse(userData);
    setCafeInfo(cafe);

    loadStats();
  }, [navigate, days]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [daily, transaction] = await Promise.all([
        getMyDailyStats(days),
        getMyStats()
      ]);
      setDailyStats(daily);
      setTransactionStats(transaction);
    } catch (error) {
      console.error('통계 불러오기 실패:', error);
      alert('통계를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    // 로그아웃하고 로그인 페이지로
    localStorage.removeItem('authToken');
    localStorage.removeItem('userType');
    localStorage.removeItem('userData');
    navigate('/login', { replace: true });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  if (!cafeInfo) {
    return <div className="cafe-stats-container">Loading...</div>;
  }

  return (
    <div className="cafe-stats-container">
      {/* Header */}
      <div className="stats-header">
        <button className="back-button" onClick={handleBack}>
          ← 뒤로
        </button>
        <h1 className="stats-title">{cafeInfo.cafeName} 통계</h1>
      </div>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="card-label">총 거래</div>
          <div className="card-value">{transactionStats.total}</div>
        </div>
        <div className="summary-card">
          <div className="card-label">오늘</div>
          <div className="card-value">{transactionStats.today}</div>
        </div>
        <div className="summary-card">
          <div className="card-label">주간</div>
          <div className="card-value">{transactionStats.weekly}</div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="period-selector">
        <button
          className={days === 7 ? 'period-btn active' : 'period-btn'}
          onClick={() => setDays(7)}
        >
          7일
        </button>
        <button
          className={days === 14 ? 'period-btn active' : 'period-btn'}
          onClick={() => setDays(14)}
        >
          14일
        </button>
        <button
          className={days === 30 ? 'period-btn active' : 'period-btn'}
          onClick={() => setDays(30)}
        >
          30일
        </button>
      </div>

      {/* Daily Stats Table */}
      <div className="stats-content">
        {loading ? (
          <div className="loading-message">로딩 중...</div>
        ) : dailyStats.length === 0 ? (
          <div className="empty-message">통계 데이터가 없습니다.</div>
        ) : (
          <div className="stats-table-container">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>모달 열림</th>
                  <th>QR 탭</th>
                  <th>QR 대여</th>
                  <th>QR 반납</th>
                  <th>전화 탭</th>
                  <th>전화 대여</th>
                  <th>전화 반납</th>
                  <th>인증 시도</th>
                  <th>총 액션</th>
                </tr>
              </thead>
              <tbody>
                {dailyStats.map((stat, index) => (
                  <tr key={index}>
                    <td>{formatDate(stat.date)}</td>
                    <td>{stat.modal_opens}</td>
                    <td>{stat.qr_tab_clicks}</td>
                    <td>{stat.qr_borrow_clicks}</td>
                    <td>{stat.qr_return_clicks}</td>
                    <td>{stat.phone_tab_clicks}</td>
                    <td>{stat.phone_borrow_clicks}</td>
                    <td>{stat.phone_return_clicks}</td>
                    <td>{stat.verification_attempts}</td>
                    <td><strong>{stat.total_actions}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="stats-legend">
        <div className="legend-item">
          <span className="legend-label">모달 열림:</span>
          <span className="legend-desc">대여/반납 버튼 클릭</span>
        </div>
        <div className="legend-item">
          <span className="legend-label">QR/전화 탭:</span>
          <span className="legend-desc">인증 방식 전환</span>
        </div>
        <div className="legend-item">
          <span className="legend-label">인증 시도:</span>
          <span className="legend-desc">QR 스캔 또는 전화번호 확인</span>
        </div>
      </div>
    </div>
  );
}

export default CafeStats;
