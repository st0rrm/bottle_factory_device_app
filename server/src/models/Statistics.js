const db = require('../config/database');

class Statistics {
  // 거래 기록 추가 (대여 또는 반납)
  static addTransaction(cafeId, transactionType, phoneNumber, quantity, callback) {
    db.run(
      'INSERT INTO transactions (cafe_id, transaction_type, phone_number, quantity) VALUES (?, ?, ?, ?)',
      [cafeId, transactionType, phoneNumber, quantity],
      callback
    );
  }

  // 카페별 총 누적 횟수 (대여 + 반납)
  static getTotalCount(cafeId, callback) {
    db.get(
      'SELECT COUNT(*) as total FROM transactions WHERE cafe_id = ?',
      [cafeId],
      callback
    );
  }

  // 카페별 오늘 거래 횟수
  static getTodayCount(cafeId, callback) {
    db.get(
      `SELECT COUNT(*) as today FROM transactions
       WHERE cafe_id = ?
       AND DATE(created_at) = DATE('now', 'localtime')`,
      [cafeId],
      callback
    );
  }

  // 카페별 주간 거래 횟수 (최근 7일)
  static getWeeklyCount(cafeId, callback) {
    db.get(
      `SELECT COUNT(*) as weekly FROM transactions
       WHERE cafe_id = ?
       AND DATE(created_at) >= DATE('now', '-7 days', 'localtime')`,
      [cafeId],
      callback
    );
  }

  // 카페별 전체 통계 한번에 가져오기
  static getCafeStats(cafeId, callback) {
    const stats = {};

    this.getTotalCount(cafeId, (err, result) => {
      if (err) return callback(err);
      stats.total = result.total;

      this.getTodayCount(cafeId, (err, result) => {
        if (err) return callback(err);
        stats.today = result.today;

        this.getWeeklyCount(cafeId, (err, result) => {
          if (err) return callback(err);
          stats.weekly = result.weekly;

          callback(null, stats);
        });
      });
    });
  }

  // 카페별 거래 내역 조회 (페이징)
  static getTransactionHistory(cafeId, limit = 50, offset = 0, callback) {
    db.all(
      `SELECT id, transaction_type, phone_number, quantity, created_at
       FROM transactions
       WHERE cafe_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [cafeId, limit, offset],
      callback
    );
  }

  // 관리자용: 모든 카페의 통계 요약
  static getAllCafesStats(callback) {
    db.all(
      `SELECT
        c.id,
        c.cafe_id,
        c.cafe_name,
        COUNT(t.id) as total_transactions,
        SUM(CASE WHEN DATE(t.created_at) = DATE('now', 'localtime') THEN 1 ELSE 0 END) as today_count,
        SUM(CASE WHEN DATE(t.created_at) >= DATE('now', '-7 days', 'localtime') THEN 1 ELSE 0 END) as weekly_count
      FROM cafes c
      LEFT JOIN transactions t ON c.id = t.cafe_id
      GROUP BY c.id
      ORDER BY c.cafe_name`,
      callback
    );
  }
}

module.exports = Statistics;
