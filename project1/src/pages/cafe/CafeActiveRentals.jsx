import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './CafeActiveRentals.css';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export default function CafeActiveRentals() {
  const [cupStatus, setCupStatus] = useState(null);
  const [activeRentals, setActiveRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newTotalCups, setNewTotalCups] = useState('');

  // 데이터 로드
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('authToken');
      const headers = { Authorization: `Bearer ${token}` };

      // 컵 현황 조회
      const cupStatusRes = await axios.get(
        `${API_URL}/statistics/my-cup-status`,
        { headers }
      );

      // 대여 현황 조회
      const rentalsRes = await axios.get(
        `${API_URL}/statistics/my-active-rentals`,
        { headers }
      );

      setCupStatus(cupStatusRes.data.data);
      setActiveRentals(rentalsRes.data.data);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 컵 개수 업데이트
  const handleUpdateTotalCups = async () => {
    try {
      const totalCups = parseInt(newTotalCups);
      if (isNaN(totalCups) || totalCups < 0) {
        alert('유효한 컵 개수를 입력해주세요 (0 이상)');
        return;
      }

      const token = localStorage.getItem('authToken');
      await axios.put(
        `${API_URL}/statistics/my-total-cups`,
        { total_cups: totalCups },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowEditModal(false);
      setNewTotalCups('');
      loadData();
    } catch (err) {
      console.error('Error updating total cups:', err);
      alert(err.response?.data?.error || 'Failed to update total cups');
    }
  };

  // 상태별 클래스 결정
  const getStatusClass = (rental) => {
    if (rental.status === 'expired') return 'status-expired';
    if (rental.status === 'overdue') return 'status-overdue';

    const daysRemaining = Math.floor(rental.days_remaining);
    if (daysRemaining < 0) return 'status-overdue';
    if (daysRemaining <= 2) return 'status-urgent';
    if (daysRemaining <= 6) return 'status-warning';
    return 'status-normal';
  };

  // 상태 텍스트
  const getStatusText = (rental) => {
    if (rental.status === 'expired') return '만료';
    if (rental.status === 'overdue') return '연체';

    const daysRemaining = Math.floor(rental.days_remaining);
    if (daysRemaining < 0) return `연체 (${Math.abs(daysRemaining)}일)`;
    if (daysRemaining === 0) return '오늘';
    return `${daysRemaining}일 남음`;
  };

  if (loading) {
    return (
      <div className="active-rentals-container">
        <div className="loading">데이터를 불러오는 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="active-rentals-container">
        <div className="error">오류: {error}</div>
      </div>
    );
  }

  return (
    <div className="active-rentals-container">
      {/* 컵 재고 현황 카드 */}
      <div className="cup-status-card">
        <div className="card-header">
          <h3>컵 재고 현황</h3>
          <button
            className="btn-edit"
            onClick={() => {
              setNewTotalCups(cupStatus?.total_cups?.toString() || '0');
              setShowEditModal(true);
            }}
          >
            수정
          </button>
        </div>

        <div className="cup-stats">
          <div className="stat-row main-stat">
            <span className="stat-label">📦 보유 컵 개수</span>
            <span className="stat-value">{cupStatus?.total_cups || 0}개</span>
          </div>

          <div className="stat-row">
            <span className="stat-label">📤 대여 중</span>
            <span className="stat-value rented">{cupStatus?.rented_cups || 0}개</span>
          </div>

          {cupStatus?.lost_cups > 0 && (
            <div className="stat-row">
              <span className="stat-label">⚠️ 손실 추정</span>
              <span className="stat-value lost">{cupStatus.lost_cups}개 (21일+ 미반납)</span>
            </div>
          )}

          <div className="stat-row">
            <span className="stat-label">📥 가게 보유 중</span>
            <span className={`stat-value available ${cupStatus?.available_cups < 10 ? 'low' : ''}`}>
              {cupStatus?.available_cups || 0}개
            </span>
          </div>

          {cupStatus?.total_cups > 0 && (
            <div className="rental-rate-bar">
              <div className="rate-label">대여율: {cupStatus.rental_rate}%</div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${cupStatus.rental_rate}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {cupStatus?.available_cups < 10 && (
          <div className="warning-message">
            ⚠️ 컵 재고가 부족합니다! 추가 구매를 고려해주세요.
          </div>
        )}
      </div>

      {/* 대여 중인 사용자 목록 */}
      <div className="rentals-list-section">
        <h3>대여 중인 사용자</h3>

        {activeRentals.length === 0 ? (
          <div className="no-data">현재 대여 중인 컵이 없습니다.</div>
        ) : (
          <div className="rentals-table-container">
            <table className="rentals-table">
              <thead>
                <tr>
                  <th>전화번호</th>
                  <th>수량</th>
                  <th>대여일</th>
                  <th>반납예정일</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {activeRentals.map((rental) => (
                  <tr key={rental.id} className={getStatusClass(rental)}>
                    <td>{rental.phone_number}</td>
                    <td>{rental.quantity}개</td>
                    <td>{new Date(rental.rental_date).toLocaleDateString('ko-KR')}</td>
                    <td>{new Date(rental.expected_return_date).toLocaleDateString('ko-KR')}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(rental)}`}>
                        {getStatusText(rental)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="rentals-summary">
          <div className="summary-item">
            <span>대여 중인 사용자</span>
            <span className="summary-value">{cupStatus?.active_users || 0}명</span>
          </div>
          <div className="summary-item">
            <span>정상 대여</span>
            <span className="summary-value">{cupStatus?.active_rentals || 0}개</span>
          </div>
          <div className="summary-item">
            <span>연체 중</span>
            <span className="summary-value overdue">{cupStatus?.overdue_rentals || 0}개</span>
          </div>
        </div>
      </div>

      {/* 컵 개수 수정 모달 */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>보유 컵 개수 설정</h3>
            <div className="modal-body">
              <div className="input-group">
                <input
                  type="number"
                  value={newTotalCups}
                  onChange={(e) => setNewTotalCups(e.target.value)}
                  placeholder="컵 개수"
                  min="0"
                />
                <span>개</span>
              </div>
              <p className="hint">
                현재 보유하고 있는 총 컵 개수를 입력해주세요.
                <br />
                (대여 중인 컵 + 가게에 있는 컵)
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowEditModal(false)}>
                취소
              </button>
              <button className="btn-save" onClick={handleUpdateTotalCups}>
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
