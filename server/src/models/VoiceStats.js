const pool = require('../config/database');

class VoiceStats {
  /**
   * 음성인식 통계 추가
   * @param {number} cafeId - 카페 ID
   * @param {string} statType - 통계 타입 (llm_api_call, takeout_detected, help_modal_opened, returnmecup_menu_entered)
   * @param {object} metadata - 추가 메타데이터 (선택)
   * @returns {Promise<object>} 생성된 통계 레코드
   */
  static async addStat(cafeId, statType, metadata = null) {
    const query = `
      INSERT INTO voice_recognition_stats (cafe_id, stat_type, metadata)
      VALUES ($1, $2, $3)
      RETURNING id, created_at;
    `;
    const result = await pool.query(query, [cafeId, statType, metadata]);
    return result.rows[0];
  }

  /**
   * 카페별 음성인식 통계 요약 조회
   * @param {number} cafeId - 카페 ID
   * @returns {Promise<object>} 통계 요약
   */
  static async getSummary(cafeId) {
    const query = `
      SELECT
        COUNT(*) FILTER (WHERE stat_type = 'llm_api_call') as llm_api_calls,
        COUNT(*) FILTER (WHERE stat_type = 'takeout_detected') as takeout_detections,
        COUNT(*) FILTER (WHERE stat_type = 'help_modal_opened') as help_modal_opens,
        COUNT(*) FILTER (WHERE stat_type = 'returnmecup_menu_entered') as menu_entries,
        COUNT(*) FILTER (WHERE stat_type = 'llm_api_call' AND DATE(created_at) = CURRENT_DATE) as today_api_calls,
        COUNT(*) FILTER (WHERE stat_type = 'takeout_detected' AND DATE(created_at) = CURRENT_DATE) as today_detections,
        COUNT(*) FILTER (WHERE stat_type = 'help_modal_opened' AND DATE(created_at) = CURRENT_DATE) as today_help_opens,
        COUNT(*) FILTER (WHERE stat_type = 'returnmecup_menu_entered' AND DATE(created_at) = CURRENT_DATE) as today_menu_entries
      FROM voice_recognition_stats
      WHERE cafe_id = $1;
    `;

    const result = await pool.query(query, [cafeId]);
    return result.rows[0];
  }

  /**
   * 카페별 음성인식 통계 상세 조회 (날짜별)
   * @param {number} cafeId - 카페 ID
   * @param {Date} startDate - 시작 날짜 (선택)
   * @param {Date} endDate - 종료 날짜 (선택)
   * @returns {Promise<Array>} 날짜별 통계
   */
  static async getCafeStats(cafeId, startDate = null, endDate = null) {
    let query = `
      SELECT
        stat_type,
        COUNT(*) as count,
        DATE_TRUNC('day', created_at) as date
      FROM voice_recognition_stats
      WHERE cafe_id = $1
    `;

    const params = [cafeId];

    if (startDate && endDate) {
      query += ` AND created_at BETWEEN $2 AND $3`;
      params.push(startDate, endDate);
    }

    query += `
      GROUP BY stat_type, DATE_TRUNC('day', created_at)
      ORDER BY date DESC, stat_type;
    `;

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * 전체 카페의 음성인식 통계 조회
   * @returns {Promise<Array>} 카페별 통계 요약
   */
  static async getAllCafesStats() {
    const query = `
      SELECT
        c.id,
        c.cafe_name,
        COUNT(*) FILTER (WHERE v.stat_type = 'llm_api_call') as llm_api_calls,
        COUNT(*) FILTER (WHERE v.stat_type = 'takeout_detected') as takeout_detections,
        COUNT(*) FILTER (WHERE v.stat_type = 'help_modal_opened') as help_modal_opens,
        COUNT(*) FILTER (WHERE v.stat_type = 'returnmecup_menu_entered') as menu_entries,
        COUNT(*) FILTER (WHERE v.stat_type = 'llm_api_call' AND DATE(v.created_at) = CURRENT_DATE) as today_api_calls,
        COUNT(*) FILTER (WHERE v.stat_type = 'takeout_detected' AND DATE(v.created_at) = CURRENT_DATE) as today_detections
      FROM cafes c
      LEFT JOIN voice_recognition_stats v ON c.id = v.cafe_id
      GROUP BY c.id, c.cafe_name
      ORDER BY c.cafe_name;
    `;

    const result = await pool.query(query);
    return result.rows;
  }

  /**
   * 특정 카페의 최근 음성인식 이벤트 조회
   * @param {number} cafeId - 카페 ID
   * @param {number} limit - 조회 개수
   * @returns {Promise<Array>} 최근 이벤트 목록
   */
  static async getRecentEvents(cafeId, limit = 50) {
    const query = `
      SELECT
        id,
        stat_type,
        metadata,
        created_at
      FROM voice_recognition_stats
      WHERE cafe_id = $1
      ORDER BY created_at DESC
      LIMIT $2;
    `;

    const result = await pool.query(query, [cafeId, limit]);
    return result.rows;
  }

  /**
   * 모든 음성인식 통계 초기화 (관리자 전용)
   * @returns {Promise<object>} 삭제된 레코드 수
   */
  static async resetAllStats() {
    const query = `DELETE FROM voice_recognition_stats;`;
    const result = await pool.query(query);
    return { deletedCount: result.rowCount };
  }
}

module.exports = VoiceStats;
