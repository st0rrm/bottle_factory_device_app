import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import { getCafes, createCafe, updateCafe, updateCafePassword, deleteCafe } from '../../api/cafe';
import { logout } from '../../api/auth';
import { getAllCafesStats } from '../../api/statistics';
import { getAllCafesBehaviorStats } from '../../api/behaviors';
import * as XLSX from 'xlsx';

function AdminDashboard() {
  const [cafes, setCafes] = useState([]);
  const [cafesStats, setCafesStats] = useState([]);
  const [behaviorStats, setBehaviorStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCafe, setSelectedCafe] = useState(null);
  const [adminInfo, setAdminInfo] = useState(null);
  const [showStatsView, setShowStatsView] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('cafe_name'); // cafe_name, total_transactions, today_count, weekly_count
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  const navigate = useNavigate();

  // 폼 데이터
  const [formData, setFormData] = useState({
    cafeId: '',
    password: '',
    cafeName: '',
  });

  useEffect(() => {
    // 관리자 인증 확인
    const userData = localStorage.getItem('userData');
    const userType = localStorage.getItem('userType');
    const authToken = localStorage.getItem('authToken');

    if (!userData || !authToken || userType !== 'admin') {
      // 관리자가 아니면 로그인 페이지로
      navigate('/login', { replace: true });
      return;
    }

    setAdminInfo(JSON.parse(userData));

    // 카페 목록 불러오기
    loadCafes();

    // 브라우저 뒤로가기 방지
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.pathname);
    };

    window.history.pushState(null, '', window.location.pathname);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  const loadCafes = async () => {
    setLoading(true);
    try {
      const data = await getCafes();
      setCafes(data);
    } catch (error) {
      console.error('카페 목록 불러오기 실패:', error);
      alert('카페 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const [stats, behaviors] = await Promise.all([
        getAllCafesStats(),
        getAllCafesBehaviorStats()
      ]);
      setCafesStats(stats);
      setBehaviorStats(behaviors);
    } catch (error) {
      console.error('통계 불러오기 실패:', error);
      alert('통계를 불러오는데 실패했습니다.');
    }
  };

  const handleShowStats = () => {
    loadStats();
    setShowStatsView(true);
  };

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      logout();
      navigate('/login', { replace: true });
    }
  };

  const handleCreateCafe = async (e) => {
    e.preventDefault();
    try {
      await createCafe(formData);
      alert('카페가 생성되었습니다.');
      setShowCreateModal(false);
      setFormData({ cafeId: '', password: '', cafeName: '' });
      loadCafes();
    } catch (error) {
      alert(error.error || '카페 생성에 실패했습니다.');
    }
  };

  const handleUpdateCafe = async (e) => {
    e.preventDefault();
    try {
      await updateCafe(selectedCafe.id, {
        cafeName: formData.cafeName,
      });
      alert('카페 정보가 수정되었습니다.');
      setShowEditModal(false);
      setSelectedCafe(null);
      setFormData({ cafeId: '', password: '', cafeName: '' });
      loadCafes();
    } catch (error) {
      alert(error.error || '카페 수정에 실패했습니다.');
    }
  };

  const handleChangePassword = async (cafeId) => {
    const newPassword = prompt('새 비밀번호를 입력하세요:');
    if (!newPassword) return;

    try {
      await updateCafePassword(cafeId, newPassword);
      alert('비밀번호가 변경되었습니다.');
    } catch (error) {
      alert(error.error || '비밀번호 변경에 실패했습니다.');
    }
  };

  const handleDeleteCafe = async (cafeId, cafeName) => {
    if (!confirm(`정말 "${cafeName}" 카페를 삭제하시겠습니까?`)) return;

    try {
      await deleteCafe(cafeId);
      alert('카페가 삭제되었습니다.');
      loadCafes();
    } catch (error) {
      alert(error.error || '카페 삭제에 실패했습니다.');
    }
  };

  const openCreateModal = () => {
    setFormData({ cafeId: '', password: '', cafeName: '' });
    setShowCreateModal(true);
  };

  const openEditModal = (cafe) => {
    setSelectedCafe(cafe);
    setFormData({
      cafeId: cafe.cafe_id,
      password: '',
      cafeName: cafe.cafe_name,
    });
    setShowEditModal(true);
  };

  // 검색 및 정렬된 카페 목록
  const getFilteredAndSortedCafes = () => {
    let filtered = cafes;

    // 검색 필터
    if (searchQuery) {
      filtered = cafes.filter(cafe =>
        cafe.cafe_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cafe.cafe_id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 정렬
    return filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];

      if (sortBy === 'created_at') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  };

  // 검색 및 정렬된 통계 목록
  const getFilteredAndSortedStats = () => {
    let combined = cafesStats.map(cafe => {
      const behavior = behaviorStats.find(b => b.id === cafe.id) || {};
      return { ...cafe, ...behavior };
    });

    // 검색 필터
    if (searchQuery) {
      combined = combined.filter(cafe =>
        cafe.cafe_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cafe.cafe_id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 정렬
    return combined.sort((a, b) => {
      let aVal = a[sortBy] || 0;
      let bVal = b[sortBy] || 0;

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  };

  // 엑셀 다운로드
  const handleExportToExcel = () => {
    const data = getFilteredAndSortedStats();

    const excelData = data.map(cafe => ({
      '카페명': cafe.cafe_name,
      '카페 ID': cafe.cafe_id,
      '총 거래': cafe.total_transactions || 0,
      '오늘 거래': cafe.today_count || 0,
      '주간 거래': cafe.weekly_count || 0,
      'QR 탭 (총)': cafe.qr_tab_clicks || 0,
      'QR 대여': cafe.qr_borrow_clicks || 0,
      'QR 반납': cafe.qr_return_clicks || 0,
      '전화 탭 (총)': cafe.phone_tab_clicks || 0,
      '전화 대여': cafe.phone_borrow_clicks || 0,
      '전화 반납': cafe.phone_return_clicks || 0,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '카페 통계');

    const fileName = `카페통계_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // 정렬 변경
  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="dashboard-title">리턴미컵 관리자</h1>
          {adminInfo && <span className="admin-name">{adminInfo.username}</span>}
        </div>
        <button className="logout-button" onClick={handleLogout}>
          로그아웃
        </button>
      </header>

      {/* Main Content */}
      <main className="dashboard-content">
        <div className="content-header">
          <h2 className="section-title">{showStatsView ? '카페 통계' : '카페 관리'}</h2>
          <div className="header-buttons">
            <button
              className={showStatsView ? 'view-button' : 'view-button active'}
              onClick={() => setShowStatsView(false)}
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
              className="create-button"
              onClick={openCreateModal}
              style={{ visibility: showStatsView ? 'hidden' : 'visible' }}
            >
              + 카페 추가
            </button>
          </div>
        </div>

        {/* 검색 및 필터 바 */}
        <div className="filter-bar">
          <input
            type="text"
            className="search-input"
            placeholder="카페명 또는 ID로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="filter-controls">
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="cafe_name">카페명</option>
              <option value="cafe_id">카페 ID</option>
              {showStatsView && (
                <>
                  <option value="total_transactions">총 거래</option>
                  <option value="today_count">오늘 거래</option>
                  <option value="weekly_count">주간 거래</option>
                  <option value="qr_tab_clicks">QR 탭</option>
                  <option value="phone_tab_clicks">전화 탭</option>
                </>
              )}
              {!showStatsView && <option value="created_at">생성일</option>}
            </select>
            <button
              className="sort-order-button"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑ 오름차순' : '↓ 내림차순'}
            </button>
            {showStatsView && (
              <button className="export-button" onClick={handleExportToExcel}>
                📊 엑셀 다운로드
              </button>
            )}
          </div>
        </div>

        {/* Stats View */}
        {showStatsView ? (
          <div className="cafe-table">
            <table>
              <thead>
                <tr>
                  <th>카페명</th>
                  <th>카페 ID</th>
                  <th>총 거래</th>
                  <th>오늘</th>
                  <th>주간</th>
                  <th>QR 탭 (총)</th>
                  <th>QR 대여</th>
                  <th>QR 반납</th>
                  <th>전화 탭 (총)</th>
                  <th>전화 대여</th>
                  <th>전화 반납</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filteredStats = getFilteredAndSortedStats();
                  if (filteredStats.length === 0) {
                    return (
                      <tr>
                        <td colSpan="11" style={{ textAlign: 'center' }}>
                          {searchQuery ? '검색 결과가 없습니다.' : '통계 데이터가 없습니다.'}
                        </td>
                      </tr>
                    );
                  }
                  return filteredStats.map((cafe) => (
                    <tr key={cafe.id}>
                      <td>{cafe.cafe_name}</td>
                      <td>{cafe.cafe_id}</td>
                      <td>{cafe.total_transactions || 0}</td>
                      <td>{cafe.today_count || 0}</td>
                      <td>{cafe.weekly_count || 0}</td>
                      <td>{cafe.qr_tab_clicks || 0}</td>
                      <td>{cafe.qr_borrow_clicks || 0}</td>
                      <td>{cafe.qr_return_clicks || 0}</td>
                      <td>{cafe.phone_tab_clicks || 0}</td>
                      <td>{cafe.phone_borrow_clicks || 0}</td>
                      <td>{cafe.phone_return_clicks || 0}</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        ) : (
          /* Cafe List */
          loading ? (
            <div className="loading">로딩 중...</div>
          ) : cafes.length === 0 ? (
            <div className="empty-state">
              <p>등록된 카페가 없습니다.</p>
              <button className="create-button" onClick={openCreateModal}>
                첫 카페 추가하기
              </button>
            </div>
          ) : (
            <div className="cafe-table">
              <table>
                <thead>
                  <tr>
                    <th>카페 ID</th>
                    <th>카페명</th>
                    <th>생성일</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredCafes = getFilteredAndSortedCafes();
                    if (filteredCafes.length === 0) {
                      return (
                        <tr>
                          <td colSpan="4" style={{ textAlign: 'center' }}>
                            {searchQuery ? '검색 결과가 없습니다.' : '등록된 카페가 없습니다.'}
                          </td>
                        </tr>
                      );
                    }
                    return filteredCafes.map((cafe) => (
                      <tr key={cafe.id}>
                        <td>{cafe.cafe_id}</td>
                        <td>{cafe.cafe_name}</td>
                        <td>{new Date(cafe.created_at).toLocaleDateString()}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              className="btn-edit"
                              onClick={() => openEditModal(cafe)}
                            >
                              수정
                            </button>
                            <button
                              className="btn-password"
                              onClick={() => handleChangePassword(cafe.id)}
                            >
                              비밀번호
                            </button>
                            <button
                              className="btn-delete"
                              onClick={() => handleDeleteCafe(cafe.id, cafe.cafe_name)}
                            >
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">카페 추가</h3>
            <form onSubmit={handleCreateCafe}>
              <div className="form-group">
                <label>카페 ID *</label>
                <input
                  type="text"
                  value={formData.cafeId}
                  onChange={(e) => setFormData({ ...formData, cafeId: e.target.value })}
                  placeholder="예: cafe001"
                  required
                />
              </div>
              <div className="form-group">
                <label>비밀번호 *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="비밀번호 입력"
                  required
                />
              </div>
              <div className="form-group">
                <label>카페명 *</label>
                <input
                  type="text"
                  value={formData.cafeName}
                  onChange={(e) => setFormData({ ...formData, cafeName: e.target.value })}
                  placeholder="예: 커피포임팩트"
                  required
                />
              </div>
              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                  취소
                </button>
                <button type="submit" className="btn-submit">
                  생성
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">카페 수정</h3>
            <form onSubmit={handleUpdateCafe}>
              <div className="form-group">
                <label>카페 ID</label>
                <input type="text" value={formData.cafeId} disabled />
              </div>
              <div className="form-group">
                <label>카페명 *</label>
                <input
                  type="text"
                  value={formData.cafeName}
                  onChange={(e) => setFormData({ ...formData, cafeName: e.target.value })}
                  required
                />
              </div>
              <div className="modal-buttons">
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>
                  취소
                </button>
                <button type="submit" className="btn-submit">
                  수정
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
