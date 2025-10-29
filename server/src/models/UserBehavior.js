const pool = require('../config/database');

class UserBehavior {
  // 행동 기록 추가
  static async trackAction(cafeId, actionType, actionDetail) {
    try {
      const result = await pool.query(
        'INSERT INTO user_behaviors (cafe_id, action_type, action_detail) VALUES ($1, $2, $3) RETURNING id',
        [cafeId, actionType, actionDetail]
      );
      return result.rows[0];
    } catch (err) {
      throw err;
    }
  }

  // 카페별 행동 통계 (QR/전화번호 탭 전환 횟수)
  static async getTabSwitchStats(cafeId) {
    try {
      const result = await pool.query(
        `SELECT
          action_detail as tab_name,
          COUNT(*) as switch_count
         FROM user_behaviors
         WHERE cafe_id = $1 AND action_type = 'tab_switch'
         GROUP BY action_detail`,
        [cafeId]
      );
      return result.rows.map(row => ({
        tab_name: row.tab_name,
        switch_count: parseInt(row.switch_count)
      }));
    } catch (err) {
      throw err;
    }
  }

  // 카페별 모달 열기 통계
  static async getModalOpenStats(cafeId) {
    try {
      const result = await pool.query(
        `SELECT
          COUNT(*) as total_opens,
          COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_opens
         FROM user_behaviors
         WHERE cafe_id = $1 AND action_type = 'modal_open'`,
        [cafeId]
      );
      return {
        total_opens: parseInt(result.rows[0].total_opens) || 0,
        today_opens: parseInt(result.rows[0].today_opens) || 0
      };
    } catch (err) {
      throw err;
    }
  }

  // 전체 카페의 행동 통계 요약 (관리자용)
  static async getAllCafesBehaviorStats() {
    try {
      const result = await pool.query(
        `SELECT
          c.id,
          c.cafe_id,
          c.cafe_name,
          COUNT(*) FILTER (WHERE ub.action_type = 'modal_open') as total_modal_opens,
          COUNT(*) FILTER (WHERE ub.action_type = 'tab_switch' AND ub.action_detail LIKE '%qr%') as qr_tab_clicks,
          COUNT(*) FILTER (WHERE ub.action_type = 'tab_switch' AND ub.action_detail LIKE '%phone%') as phone_tab_clicks,
          COUNT(*) FILTER (WHERE ub.action_type = 'tab_switch' AND ub.action_detail = 'qr_borrow') as qr_borrow_clicks,
          COUNT(*) FILTER (WHERE ub.action_type = 'tab_switch' AND ub.action_detail = 'qr_return') as qr_return_clicks,
          COUNT(*) FILTER (WHERE ub.action_type = 'tab_switch' AND ub.action_detail = 'phone_borrow') as phone_borrow_clicks,
          COUNT(*) FILTER (WHERE ub.action_type = 'tab_switch' AND ub.action_detail = 'phone_return') as phone_return_clicks,
          COUNT(*) FILTER (WHERE ub.action_type = 'tab_switch') as total_tab_switches
        FROM cafes c
        LEFT JOIN user_behaviors ub ON c.id = ub.cafe_id
        GROUP BY c.id, c.cafe_id, c.cafe_name
        ORDER BY c.cafe_name`
      );

      return result.rows.map(row => ({
        ...row,
        total_modal_opens: parseInt(row.total_modal_opens) || 0,
        qr_tab_clicks: parseInt(row.qr_tab_clicks) || 0,
        phone_tab_clicks: parseInt(row.phone_tab_clicks) || 0,
        qr_borrow_clicks: parseInt(row.qr_borrow_clicks) || 0,
        qr_return_clicks: parseInt(row.qr_return_clicks) || 0,
        phone_borrow_clicks: parseInt(row.phone_borrow_clicks) || 0,
        phone_return_clicks: parseInt(row.phone_return_clicks) || 0,
        total_tab_switches: parseInt(row.total_tab_switches) || 0
      }));
    } catch (err) {
      throw err;
    }
  }

  // 특정 기간 동안의 행동 데이터
  static async getBehaviorsByDateRange(cafeId, startDate, endDate) {
    try {
      const result = await pool.query(
        `SELECT
          action_type,
          action_detail,
          COUNT(*) as count,
          DATE(created_at) as date
         FROM user_behaviors
         WHERE cafe_id = $1
         AND DATE(created_at) BETWEEN $2 AND $3
         GROUP BY action_type, action_detail, DATE(created_at)
         ORDER BY created_at DESC`,
        [cafeId, startDate, endDate]
      );

      return result.rows.map(row => ({
        ...row,
        count: parseInt(row.count)
      }));
    } catch (err) {
      throw err;
    }
  }

  // 최근 행동 내역 조회
  static async getRecentBehaviors(cafeId, limit = 100) {
    try {
      const result = await pool.query(
        `SELECT
          action_type,
          action_detail,
          created_at
         FROM user_behaviors
         WHERE cafe_id = $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [cafeId, limit]
      );
      return result.rows;
    } catch (err) {
      throw err;
    }
  }
}

module.exports = UserBehavior;
