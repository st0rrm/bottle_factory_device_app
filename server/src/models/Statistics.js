const pool = require('../config/database');
const { db } = require('../config/firebase');

class Statistics {
  // Firebase에서 QR 적립 통계 가져오기 (기존 앱)
  static async getFirebaseQRStats(shopId, cafeCreatedAt) {
    try {
      console.log('🔥 [getFirebaseQRStats] shopId:', shopId);
      console.log('🔥 [getFirebaseQRStats] cafeCreatedAt:', cafeCreatedAt);

      // source 필드가 없는 것만 = 기존 앱 QR 적립
      // 카페 생성일 이후만 집계 (웹 앱 등록일 기준)
      let query = db.collection('collect_history')
        .where('shop_id', '==', shopId);

      // 카페 생성일이 있으면 그 이후만 필터링
      if (cafeCreatedAt) {
        const cutoffDate = new Date(cafeCreatedAt);
        console.log('🔥 [getFirebaseQRStats] cutoffDate:', cutoffDate);
        query = query.where('create', '>=', cutoffDate);
      }

      const snapshot = await query.get();
      console.log('🔥 [getFirebaseQRStats] 총 문서 수:', snapshot.size);

      let totalScore = 0;
      let totalCount = 0;
      let today = 0;
      let weekly = 0;

      let webSourceCount = 0;
      let qrCollectCount = 0;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      snapshot.forEach(doc => {
        const data = doc.data();

        // source가 'web'인 것은 제외 (이미 PostgreSQL에 있음)
        if (data.source === 'web') {
          webSourceCount++;
          return;
        }

        // QR 적립만 집계
        qrCollectCount++;
        const score = data.score || 0;
        const createdAt = data.create?.toDate();

        totalScore += score;
        totalCount += 1;

        if (createdAt) {
          if (createdAt >= todayStart) {
            today += 1;
          }
          if (createdAt >= weekAgo) {
            weekly += 1;
          }
        }
      });

      console.log('🔥 [getFirebaseQRStats] 웹 source 제외:', webSourceCount);
      console.log('🔥 [getFirebaseQRStats] QR 적립 집계:', qrCollectCount);
      console.log('🔥 [getFirebaseQRStats] 결과:', { totalScore, totalCount, today, weekly });

      return { totalScore, totalCount, today, weekly };
    } catch (error) {
      console.error('❌ Firebase QR stats error:', error);
      return { totalScore: 0, totalCount: 0, today: 0, weekly: 0 };
    }
  }
  // 거래 기록 추가 (대여, 반납, 또는 실천)
  static async addTransaction(cafeId, transactionType, phoneNumber, quantity, score = 0) {
    try {
      const result = await pool.query(
        'INSERT INTO transactions (cafe_id, transaction_type, phone_number, quantity, score) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [cafeId, transactionType, phoneNumber, quantity, score]
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

  // 카페별 전체 통계 한번에 가져오기 (PostgreSQL + Firebase 합산)
  static async getCafeStats(cafeId) {
    try {
      console.log('📊 [getCafeStats] cafeId:', cafeId);

      // 1. PostgreSQL 통계 (웹 앱)
      const pgResult = await pool.query(
        `SELECT
          COALESCE(SUM(score), 0) as total_score,
          COALESCE(SUM(quantity) FILTER (WHERE transaction_type IN ('borrow', 'do')), 0) as total_count,
          COALESCE(SUM(quantity) FILTER (WHERE transaction_type IN ('borrow', 'do') AND DATE(created_at) = CURRENT_DATE), 0) as today,
          COALESCE(SUM(quantity) FILTER (WHERE transaction_type IN ('borrow', 'do') AND created_at >= CURRENT_DATE - INTERVAL '7 days'), 0) as weekly
        FROM transactions
        WHERE cafe_id = $1`,
        [cafeId]
      );

      const pgStats = {
        totalScore: parseInt(pgResult.rows[0].total_score) || 0,
        totalCount: parseInt(pgResult.rows[0].total_count) || 0,
        today: parseInt(pgResult.rows[0].today) || 0,
        weekly: parseInt(pgResult.rows[0].weekly) || 0
      };
      console.log('  ✅ PostgreSQL 통계:', pgStats);

      // 2. Firebase shopId와 웹 카페 생성일 조회
      const cafeResult = await pool.query(
        'SELECT cafe_id, created_at FROM cafes WHERE id = $1',
        [cafeId]
      );

      if (cafeResult.rows.length === 0) {
        console.log('  ⚠️ cafe_id 없음 - PostgreSQL만 반환');
        return pgStats; // cafe_id 없으면 PostgreSQL만
      }

      const shopId = cafeResult.rows[0].cafe_id;
      const cafeCreatedAt = cafeResult.rows[0].created_at; // 웹에서 계정 생성한 날짜
      console.log('  🔑 shopId:', shopId);
      console.log('  📅 카페 생성일:', cafeCreatedAt);

      // 3. Firebase QR 적립 통계 (웹 계정 생성일 이후만)
      const firebaseStats = await this.getFirebaseQRStats(shopId, cafeCreatedAt);
      console.log('  🔥 Firebase 통계:', firebaseStats);

      // 4. 합산
      const combined = {
        totalScore: pgStats.totalScore + firebaseStats.totalScore,
        totalCount: pgStats.totalCount + firebaseStats.totalCount,
        today: pgStats.today + firebaseStats.today,
        weekly: pgStats.weekly + firebaseStats.weekly
      };
      console.log('  ✨ 합산 결과:', combined);

      return combined;
    } catch (err) {
      console.error('❌ [getCafeStats] 에러:', err);
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
          COALESCE(SUM(t.quantity) FILTER (WHERE t.transaction_type IN ('borrow', 'do')), 0) as total_transactions,
          COALESCE(SUM(t.quantity) FILTER (WHERE t.transaction_type IN ('borrow', 'do') AND DATE(t.created_at) = CURRENT_DATE), 0) as today_count,
          COALESCE(SUM(t.quantity) FILTER (WHERE t.transaction_type IN ('borrow', 'do') AND t.created_at >= CURRENT_DATE - INTERVAL '7 days'), 0) as weekly_count,
          COALESCE(SUM(t.score), 0) as total_score
        FROM cafes c
        LEFT JOIN transactions t ON c.id = t.cafe_id
        GROUP BY c.id, c.cafe_id, c.cafe_name
        ORDER BY c.cafe_name`
      );

      return result.rows.map(row => ({
        ...row,
        total_transactions: parseInt(row.total_transactions) || 0,
        today_count: parseInt(row.today_count) || 0,
        weekly_count: parseInt(row.weekly_count) || 0,
        total_score: parseInt(row.total_score) || 0
      }));
    } catch (err) {
      throw err;
    }
  }

  // 관리자용: 모든 통계 초기화 (모든 거래 기록 및 행동 데이터 삭제)
  static async resetAllStats() {
    try {
      // Delete user behaviors (QR 탭, 전화 탭 등)
      const behaviorsResult = await pool.query('DELETE FROM user_behaviors');

      // Delete transactions
      const transactionsResult = await pool.query('DELETE FROM transactions');

      const totalDeleted = behaviorsResult.rowCount + transactionsResult.rowCount;

      return {
        success: true,
        deletedCount: totalDeleted,
        deletedBehaviors: behaviorsResult.rowCount,
        deletedTransactions: transactionsResult.rowCount
      };
    } catch (err) {
      throw err;
    }
  }
}

module.exports = Statistics;
