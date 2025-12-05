// This file contains only the NEW CODE to add to AdminDashboard.jsx
// Do not use this file directly - it's for reference only

// ============================================================
// 1. ADD TO IMPORTS (line 6)
// ============================================================
import { getAllCafesStats, resetCafeStats, getCafeTransactionDetails } from '../../api/statistics';

// ============================================================
// 2. ADD TO STATE DECLARATIONS (after line 21)
// ============================================================
const [showTransactionsView, setShowTransactionsView] = useState(false);
const [transactions, setTransactions] = useState([]);
const [selectedTransactionCafe, setSelectedTransactionCafe] = useState('');
const [transactionTypeFilter, setTransactionTypeFilter] = useState('all');

// ============================================================
// 3. UPDATE handleShowStats, handleShowDailyStats (replace lines 122-132)
// ============================================================
const handleShowStats = () => {
  loadStats();
  setShowStatsView(true);
  setShowDailyView(false);
  setShowTransactionsView(false);
};

const handleShowDailyStats = () => {
  loadDailyStats();
  setShowDailyView(true);
  setShowStatsView(false);
  setShowTransactionsView(false);
};

// ============================================================
// 4. ADD NEW FUNCTIONS (after handleShowDailyStats)
// ============================================================
const handleShowTransactions = () => {
  setShowTransactionsView(true);
  setShowStatsView(false);
  setShowDailyView(false);
  if (cafes.length > 0 && !selectedTransactionCafe) {
    setSelectedTransactionCafe(cafes[0].id);
    loadTransactionDetails(cafes[0].id);
  } else if (selectedTransactionCafe) {
    loadTransactionDetails(selectedTransactionCafe);
  }
};

const loadTransactionDetails = async (cafeId) => {
  try {
    const options = {
      limit: 100,
      offset: 0,
      type: transactionTypeFilter === 'all' ? null : transactionTypeFilter
    };
    const result = await getCafeTransactionDetails(cafeId, options);
    setTransactions(result.data || []);
  } catch (error) {
    console.error('거래 내역 불러오기 실패:', error);
    alert('거래 내역을 불러오는데 실패했습니다.');
  }
};

// ============================================================
// 5. ADD useEffect (after line 139)
// ============================================================
useEffect(() => {
  if (showTransactionsView && selectedTransactionCafe) {
    loadTransactionDetails(selectedTransactionCafe);
  }
}, [transactionTypeFilter, selectedTransactionCafe]);

// ============================================================
// 6. ADD EXCEL EXPORT FUNCTION (after handleExportToExcel)
// ============================================================
const handleExportTransactionsToExcel = () => {
  if (transactions.length === 0) {
    alert('다운로드할 거래 내역이 없습니다.');
    return;
  }

  const selectedCafe = cafes.find(c => c.id === parseInt(selectedTransactionCafe));
  const cafeName = selectedCafe?.cafe_name || '알 수 없음';

  const excelData = transactions.map(txn => ({
    'ID': txn.id,
    '거래 유형': txn.transaction_type_kr,
    '전화번호': txn.phone_number,
    '수량': txn.quantity,
    '포인트': txn.score,
    '거래 일시': new Date(txn.created_at).toLocaleString('ko-KR')
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '거래 내역');

  const fileName = `${cafeName}_거래내역_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

// ============================================================
// 7. UPDATE HEADER BUTTONS (replace lines 404-434)
// ============================================================
<div className="content-header">
  <h2 className="section-title">
    {showTransactionsView ? '거래 내역' : showDailyView ? '일별 통계' : showStatsView ? '카페 통계' : '카페 관리'}
  </h2>
  <div className="header-buttons">
    <button
      className={!showStatsView && !showDailyView && !showTransactionsView ? 'view-button active' : 'view-button'}
      onClick={() => { setShowStatsView(false); setShowDailyView(false); setShowTransactionsView(false); }}
    >
      카페 관리
    </button>
    <button
      className={showStatsView ? 'view-button active' : 'view-button'}
      onClick={handleShowStats}
    >
      통계 보기
    </button>
    <button
      className={showDailyView ? 'view-button active' : 'view-button'}
      onClick={handleShowDailyStats}
    >
      일별 통계
    </button>
    <button
      className={showTransactionsView ? 'view-button active' : 'view-button'}
      onClick={handleShowTransactions}
    >
      거래 내역
    </button>
    <button
      className="create-button"
      onClick={openCreateModal}
      style={{ visibility: showStatsView || showDailyView || showTransactionsView ? 'hidden' : 'visible' }}
    >
      + 카페 추가
    </button>
  </div>
</div>

// ============================================================
// 8. UPDATE FILTER BAR (replace line 438)
// ============================================================
{!showDailyView && !showTransactionsView && (

// ============================================================
// 9. ADD TRANSACTIONS FILTER BAR (after line 490, before Daily Stats View)
// ============================================================
{/* 거래 내역 필터 바 */}
{showTransactionsView && (
  <div className="filter-bar">
    <select
      className="cafe-filter-select"
      value={selectedTransactionCafe}
      onChange={(e) => setSelectedTransactionCafe(e.target.value)}
    >
      {cafes.map((cafe) => (
        <option key={cafe.id} value={cafe.id}>
          {cafe.cafe_name}
        </option>
      ))}
    </select>

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
      📊 엑셀 다운로드
    </button>
  </div>
)}

// ============================================================
// 10. ADD TRANSACTIONS VIEW (insert after line 622, before showStatsView)
// ============================================================
) : showTransactionsView ? (
  /* Transactions View */
  <div className="cafe-table">
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>거래 유형</th>
          <th>전화번호</th>
          <th>수량</th>
          <th>포인트</th>
          <th>거래 일시</th>
        </tr>
      </thead>
      <tbody>
        {transactions.length === 0 ? (
          <tr>
            <td colSpan="6" style={{ textAlign: 'center' }}>
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
