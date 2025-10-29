const pool = require('../config/database');

class Statistics {
  // 거래 기록 추가 (대여 또는 반납)
  static async addTransaction(cafeId, transactionType, phoneNumber, quantity) {
    try {
      const result = await pool.query(
        'INSERT INTO transactions (cafe_id, transaction_type, phone_number, quantity) VALUES ($1, $2, $3, $4) RETURNING id',
        [cafeId, transactionType, phoneNumber, quantity]
      );
      return result.rows[0];
    } catch (err) {
      throw err;
    }
  }

  // 카페별 총 누적 횟수 (대여 + 반납)
  static async getTotalCount(cafeId) {
    try {
      const result = await pool.query(
        'SELECT COUNT(*) as total FROM transactions WHERE cafe_id = $1',
        [cafeId]
      );
      return parseInt(result.rows[0].total);
    } catch (err) {
      throw err;
    }
  }

  // 카페별 오늘 거래 횟수
  static async getTodayCount(cafeId) {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) as today FROM transactions
         WHERE cafe_id = $1
         AND DATE(created_at) = CURRENT_DATE`,
        [cafeId]
      );
      return parseInt(result.rows[0].today);
    } catch (err) {
      throw err;
    }
  }

  // 카페별 주간 거래 횟수 (최근 7일)
  static async getWeeklyCount(cafeId) {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) as weekly FROM transactions
         WHERE cafe_id = $1
         AND created_at >= CURRENT_DATE - INTERVAL '7 days'`,
        [cafeId]
      );
      return parseInt(result.rows[0].weekly);
    } catch (err) {
      throw err;
    }
  }

  // 카페별 전체 통계 한번에 가져오기
  static async getCafeStats(cafeId) {
    try {
      const result = await pool.query(
        `SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as weekly
        FROM transactions
        WHERE cafe_id = $1`,
        [cafeId]
      );

      return {
        total: parseInt(result.rows[0].total) || 0,
        today: parseInt(result.rows[0].today) || 0,
        weekly: parseInt(result.rows[0].weekly) || 0
      };
    } catch (err) {
      throw err;
    }
  }

  // 카페별 거래 내역 조회 (페이징)
  static async getTransactionHistory(cafeId, limit = 50, offset = 0) {
    try {
      const result = await pool.query(
        `SELECT id, transaction_type, phone_number, quantity, created_at
         FROM transactions
         WHERE cafe_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [cafeId, limit, offset]
      );
      return result.rows;
    } catch (err) {
      throw err;
    }
  }

  // 관리자용: 모든 카페의 통계 요약
  static async getAllCafesStats() {
    try {
      const result = await pool.query(
        `SELECT
          c.id,
          c.cafe_id,
          c.cafe_name,
          COUNT(t.id) as total_transactions,
          COUNT(t.id) FILTER (WHERE DATE(t.created_at) = CURRENT_DATE) as today_count,
          COUNT(t.id) FILTER (WHERE t.created_at >= CURRENT_DATE - INTERVAL '7 days') as weekly_count
        FROM cafes c
        LEFT JOIN transactions t ON c.id = t.cafe_id
        GROUP BY c.id, c.cafe_id, c.cafe_name
        ORDER BY c.cafe_name`
      );

      return result.rows.map(row => ({
        ...row,
        total_transactions: parseInt(row.total_transactions) || 0,
        today_count: parseInt(row.today_count) || 0,
        weekly_count: parseInt(row.weekly_count) || 0
      }));
    } catch (err) {
      throw err;
    }
  }
}

module.exports = Statistics;
