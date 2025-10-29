const db = require('../config/database');

class UserBehavior {
  // 행동 기록 추가
  static trackAction(cafeId, actionType, actionDetail, callback) {
    db.run(
      'INSERT INTO user_behaviors (cafe_id, action_type, action_detail) VALUES (?, ?, ?)',
      [cafeId, actionType, actionDetail],
      callback
    );
  }

  // 카페별 행동 통계 (QR/전화번호 탭 전환 횟수)
  static getTabSwitchStats(cafeId, callback) {
    db.all(
      `SELECT
        action_detail as tab_name,
        COUNT(*) as switch_count
       FROM user_behaviors
       WHERE cafe_id = ? AND action_type = 'tab_switch'
       GROUP BY action_detail`,
      [cafeId],
      callback
    );
  }

  // 카페별 모달 열기 통계
  static getModalOpenStats(cafeId, callback) {
    db.get(
      `SELECT
        COUNT(*) as total_opens,
        COUNT(CASE WHEN DATE(created_at) = DATE('now', 'localtime') THEN 1 END) as today_opens
       FROM user_behaviors
       WHERE cafe_id = ? AND action_type = 'modal_open'`,
      [cafeId],
      callback
    );
  }

  // 전체 카페의 행동 통계 요약 (관리자용)
  static getAllCafesBehaviorStats(callback) {
    db.all(
      `SELECT
        c.id,
        c.cafe_id,
        c.cafe_name,
        COUNT(CASE WHEN ub.action_type = 'modal_open' THEN 1 END) as total_modal_opens,
        COUNT(CASE WHEN ub.action_type = 'tab_switch' AND ub.action_detail LIKE '%qr%' THEN 1 END) as qr_tab_clicks,
        COUNT(CASE WHEN ub.action_type = 'tab_switch' AND ub.action_detail LIKE '%phone%' THEN 1 END) as phone_tab_clicks,
        COUNT(CASE WHEN ub.action_type = 'tab_switch' AND ub.action_detail = 'qr_borrow' THEN 1 END) as qr_borrow_clicks,
        COUNT(CASE WHEN ub.action_type = 'tab_switch' AND ub.action_detail = 'qr_return' THEN 1 END) as qr_return_clicks,
        COUNT(CASE WHEN ub.action_type = 'tab_switch' AND ub.action_detail = 'phone_borrow' THEN 1 END) as phone_borrow_clicks,
        COUNT(CASE WHEN ub.action_type = 'tab_switch' AND ub.action_detail = 'phone_return' THEN 1 END) as phone_return_clicks,
        COUNT(CASE WHEN ub.action_type = 'tab_switch' THEN 1 END) as total_tab_switches
      FROM cafes c
      LEFT JOIN user_behaviors ub ON c.id = ub.cafe_id
      GROUP BY c.id
      ORDER BY c.cafe_name`,
      callback
    );
  }

  // 특정 기간 동안의 행동 데이터
  static getBehaviorsByDateRange(cafeId, startDate, endDate, callback) {
    db.all(
      `SELECT
        action_type,
        action_detail,
        COUNT(*) as count,
        DATE(created_at) as date
       FROM user_behaviors
       WHERE cafe_id = ?
       AND DATE(created_at) BETWEEN ? AND ?
       GROUP BY action_type, action_detail, DATE(created_at)
       ORDER BY created_at DESC`,
      [cafeId, startDate, endDate],
      callback
    );
  }

  // 최근 행동 내역 조회
  static getRecentBehaviors(cafeId, limit = 100, callback) {
    db.all(
      `SELECT
        action_type,
        action_detail,
        created_at
       FROM user_behaviors
       WHERE cafe_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [cafeId, limit],
      callback
    );
  }
}

module.exports = UserBehavior;
