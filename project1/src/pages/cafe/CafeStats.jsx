import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './CafeStats.css';
import { getMyDailyStats } from '../../api/behaviors';
import { getMyStats, getMyHistory } from '../../api/statistics';
import * as XLSX from 'xlsx';
import CafeActiveRentals from './CafeActiveRentals';

function CafeStats() {
  const navigate = useNavigate();
  const [cafeInfo, setCafeInfo] = useState(null);
  const [dailyStats, setDailyStats] = useState([]);
  const [transactionStats, setTransactionStats] = useState({ totalCount: 0, today: 0, weekly: 0 });
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  // 뷰 전환 관련 state ('stats', 'transactions', 'rentals')
  const [currentView, setCurrentView] = useState('stats');
  const [transactions, setTransactions] = useState([]);
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('all');

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

  const loadTransactions = async () => {
    try {
      const result = await getMyHistory(100, 0);
      // 거래 유형별 필터링
      let filteredData = result.data || [];
      if (transactionTypeFilter !== 'all') {
        filteredData = filteredData.filter(txn => txn.transaction_type === transactionTypeFilter);
      }
      setTransactions(filteredData);
    } catch (error) {
      console.error('거래 내역 불러오기 실패:', error);
      alert('거래 내역을 불러오는데 실패했습니다.');
    }
  };

  // 거래 내역 필터 변경 시 다시 불러오기
  useEffect(() => {
    if (showTransactionsView) {
      loadTransactions();
    }
  }, [transactionTypeFilter, showTransactionsView]);

  // 엑셀 다운로드
  const handleExportTransactionsToExcel = () => {
    if (transactions.length === 0) {
      alert('다운로드할 거래 내역이 없습니다.');
      return;
    }

    const excelData = transactions.map(txn => ({
      'ID': txn.id,
      '거래 유형': txn.transaction_type_kr,
      '사용자 구분': txn.is_new_user === null ? '기존' : txn.is_new_user ? '신규' : '기존',
      '전화번호': txn.phone_number,
      '수량': txn.quantity,
      '포인트': txn.score,
      '거래 일시': new Date(txn.created_at).toLocaleString('ko-KR')
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '거래 내역');

    const fileName = `${cafeInfo?.cafeName || '카페'}_거래내역_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
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
          <div className="card-value">{transactionStats.totalCount}회</div>
          <div className="card-breakdown">
            대여 {transactionStats.totalBorrow || 0} · 반납 {transactionStats.totalReturn || 0} · 실천 {transactionStats.totalDo || 0}
          </div>
        </div>
        <div className="summary-card">
          <div className="card-label">오늘</div>
          <div className="card-value">{transactionStats.today}회</div>
          <div className="card-breakdown">
            대여 {transactionStats.todayBorrow || 0} · 반납 {transactionStats.todayReturn || 0} · 실천 {transactionStats.todayDo || 0}
          </div>
        </div>
        <div className="summary-card">
          <div className="card-label">주간</div>
          <div className="card-value">{transactionStats.weekly}회</div>
          <div className="card-breakdown">
            대여 {transactionStats.weeklyBorrow || 0} · 반납 {transactionStats.weeklyReturn || 0} · 실천 {transactionStats.weeklyDo || 0}
          </div>
        </div>
      </div>

      {/* View Toggle Buttons */}
      <div className="view-toggle">
        <button
          className={currentView === 'stats' ? 'view-btn active' : 'view-btn'}
          onClick={() => setCurrentView('stats')}
        >
          일별 통계
        </button>
        <button
          className={currentView === 'rentals' ? 'view-btn active' : 'view-btn'}
          onClick={() => setCurrentView('rentals')}
        >
          대여 현황
        </button>
        <button
          className={currentView === 'transactions' ? 'view-btn active' : 'view-btn'}
          onClick={() => setCurrentView('transactions')}
        >
          거래 내역
        </button>
      </div>

      {/* Period Selector - 일별 통계 뷰일 때만 표시 */}
      {currentView === 'stats' && (
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
      )}

      {/* Transaction Filter - 거래 내역 뷰일 때만 표시 */}
      {currentView === 'transactions' && (
        <div className="filter-bar">
          <select
            className="sort-select"
            value={transactionTypeFilter}
            onChange={(e) => setTransactionTypeFilter(e.target.value)}
          >
            <option value="all">전체 거래</option>
            <option value="borrow">대여</option>
            <option value="return">반납</option>
            <option value="do">실천</option>
          </select>

          <button className="export-button" onClick={handleExportTransactionsToExcel}>
            엑셀 다운로드
          </button>
        </div>
      )}

      {/* Stats Content */}
      <div className="stats-content">
        {currentView === 'rentals' ? (
          /* Active Rentals View */
          <CafeActiveRentals />
        ) : currentView === 'transactions' ? (
          /* Transactions View */
          <div className="stats-table-container">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>거래 유형</th>
                  <th>사용자 구분</th>
                  <th>전화번호</th>
                  <th>수량</th>
                  <th>포인트</th>
                  <th>거래 일시</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center' }}>
                      거래 내역이 없습니다.
                    </td>
                  </tr>
                ) : (
                  transactions.map((txn) => (
                    <tr key={txn.id}>
                      <td>{txn.id}</td>
                      <td>
                        <span className={`transaction-badge transaction-${txn.transaction_type}`}>
                          {txn.transaction_type_kr}
                        </span>
                      </td>
                      <td>
                        {txn.is_new_user === null ? '기존' : txn.is_new_user ? '신규' : '기존'}
                      </td>
                      <td>{txn.phone_number}</td>
                      <td>{txn.quantity}</td>
                      <td>{txn.score}</td>
                      <td>{new Date(txn.created_at).toLocaleString('ko-KR')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Daily Stats View */
          loading ? (
            <div className="loading-message">로딩 중...</div>
          ) : dailyStats.length === 0 ? (
            <div className="empty-message">통계 데이터가 없습니다.</div>
          ) : (
            <div className="stats-table-container">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>날짜</th>
                    <th>대여 모달</th>
                    <th>반납 모달</th>
                    <th>QR 탭</th>
                    <th>QR 대여</th>
                    <th>QR 반납</th>
                    <th>QR 실천</th>
                    <th>전화 탭</th>
                    <th>전화 대여</th>
                    <th>전화 반납</th>
                    <th>전화 실천</th>
                    <th>인증 시도</th>
                    <th>총 액션</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyStats.map((stat, index) => (
                    <tr key={index}>
                      <td>{formatDate(stat.date)}</td>
                      <td>{stat.borrow_modal_opens}</td>
                      <td>{stat.return_modal_opens}</td>
                      <td>{stat.qr_tab_clicks}</td>
                      <td>{stat.qr_borrow_clicks}</td>
                      <td>{stat.qr_return_clicks}</td>
                      <td>{stat.qr_do_clicks || 0}</td>
                      <td>{stat.phone_tab_clicks}</td>
                      <td>{stat.phone_borrow_clicks}</td>
                      <td>{stat.phone_return_clicks}</td>
                      <td>{stat.phone_do_clicks || 0}</td>
                      <td>{stat.verification_attempts}</td>
                      <td><strong>{stat.total_actions}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
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
