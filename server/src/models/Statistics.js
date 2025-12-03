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

  // Firebase에서 QR 대여 통계 가져오기 (기존 앱)
  static async getFirebaseQRRentals(shopId, cafeCreatedAt) {
    try {
      console.log('📱 [getFirebaseQRRentals] shopId:', shopId);
      console.log('📱 [getFirebaseQRRentals] cafeCreatedAt:', cafeCreatedAt);

      // rents 컬렉션에서 QR 대여만 조회 (source가 'web'이 아닌 것)
      let query = db.collection('rents')
        .where('rented_shop_id', '==', shopId);

      const snapshot = await query.get();
      console.log('📱 [getFirebaseQRRentals] 총 대여 문서 수:', snapshot.size);

      let totalScore = 0;
      let totalCount = 0;
      let today = 0;
      let weekly = 0;

      let webRentalCount = 0;
      let qrRentalCount = 0;

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const cutoffDate = cafeCreatedAt ? new Date(cafeCreatedAt) : null;

      snapshot.forEach(doc => {
        const data = doc.data();
        const rentedDate = data.rented_date?.toDate();

        // 카페 생성일 이전 대여는 제외
        if (cutoffDate && rentedDate && rentedDate < cutoffDate) {
          return;
        }

        // source가 'web'인 것은 제외 (이미 PostgreSQL에 있음)
        if (data.source === 'web') {
          webRentalCount++;
          return;
        }

        // QR 대여만 집계 (대여 1개당 30점)
        qrRentalCount++;
        const score = 30;

        totalScore += score;
        totalCount += 1;

        if (rentedDate) {
          if (rentedDate >= todayStart) {
            today += 1;
          }
          if (rentedDate >= weekAgo) {
            weekly += 1;
          }
        }
      });

      console.log('📱 [getFirebaseQRRentals] 웹 대여 제외:', webRentalCount);
      console.log('📱 [getFirebaseQRRentals] QR 대여 집계:', qrRentalCount);
      console.log('📱 [getFirebaseQRRentals] 결과:', { totalScore, totalCount, today, weekly });

      return { totalScore, totalCount, today, weekly };
    } catch (error) {
      console.error('❌ Firebase QR rentals error:', error);
      return { totalScore: 0, totalCount: 0, today: 0, weekly: 0 };
    }
  }
  // 거래 기록 추가 (대여, 반납, 또는 실천)
  static async addTransaction(cafeId, transactionType, phoneNumber, quantity, score = 0, isNewUser = null, source = 'web') {
    try {
      // 1. transactions 테이블에 기록
      const result = await pool.query(
        'INSERT INTO transactions (cafe_id, transaction_type, phone_number, quantity, score, is_new_user, source) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at',
        [cafeId, transactionType, phoneNumber, quantity, score, isNewUser, source]
      );

      const transactionId = result.rows[0].id;
      const createdAt = result.rows[0].created_at;

      // 2. active_rentals 동기화 (전화번호가 있는 경우만)
      if (phoneNumber) {
        if (transactionType === 'borrow') {
          // 대여: active_rentals에 추가
          const expectedReturnDate = new Date(createdAt);
          expectedReturnDate.setDate(expectedReturnDate.getDate() + 14); // 14일 후

          await this.addActiveRental(
            cafeId,
            phoneNumber,
            quantity,
            createdAt,
            expectedReturnDate,
            transactionId
          );

          console.log(`✅ [addTransaction] Active rental added: cafe_id=${cafeId}, phone=${phoneNumber}, qty=${quantity}`);

        } else if (transactionType === 'return') {
          // 반납: active_rentals에서 제거
          const removeResult = await this.removeActiveRental(cafeId, phoneNumber, quantity);

          if (removeResult) {
            console.log(`✅ [addTransaction] Active rental ${removeResult.action}: cafe_id=${cafeId}, phone=${phoneNumber}, qty=${quantity}`);
          } else {
            console.warn(`⚠️ [addTransaction] No active rental found for return: cafe_id=${cafeId}, phone=${phoneNumber}`);
          }
        }
      }

      return result.rows[0];
    } catch (err) {
      console.error('Error in addTransaction:', err);
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

  // 카페별 전체 통계 한번에 가져오기 (PostgreSQL만 조회 - 효율적!)
  // Firebase 데이터는 실시간 리스너가 PostgreSQL에 자동 동기화함
  static async getCafeStats(cafeId) {
    try {
      console.log('📊 [getCafeStats] cafeId:', cafeId);

      // PostgreSQL 통계 (웹 앱 + QR 대여 + QR 적립 모두 포함)
      const pgResult = await pool.query(
        `SELECT
          COALESCE(SUM(score), 0) as total_score,
          COALESCE(SUM(quantity) FILTER (WHERE transaction_type IN ('borrow', 'return', 'do')), 0) as total_count,
          COALESCE(SUM(quantity) FILTER (WHERE transaction_type IN ('borrow', 'return', 'do') AND DATE(created_at) = CURRENT_DATE), 0) as today,
          COALESCE(SUM(quantity) FILTER (WHERE transaction_type IN ('borrow', 'return', 'do') AND created_at >= CURRENT_DATE - INTERVAL '7 days'), 0) as weekly,
          COALESCE(SUM(quantity) FILTER (WHERE transaction_type = 'borrow'), 0) as total_borrow,
          COALESCE(SUM(quantity) FILTER (WHERE transaction_type = 'return'), 0) as total_return,
          COALESCE(SUM(quantity) FILTER (WHERE transaction_type = 'do'), 0) as total_do,
          COALESCE(SUM(quantity) FILTER (WHERE transaction_type = 'borrow' AND DATE(created_at) = CURRENT_DATE), 0) as today_borrow,
          COALESCE(SUM(quantity) FILTER (WHERE transaction_type = 'return' AND DATE(created_at) = CURRENT_DATE), 0) as today_return,
          COALESCE(SUM(quantity) FILTER (WHERE transaction_type = 'do' AND DATE(created_at) = CURRENT_DATE), 0) as today_do,
          COALESCE(SUM(quantity) FILTER (WHERE transaction_type = 'borrow' AND created_at >= CURRENT_DATE - INTERVAL '7 days'), 0) as weekly_borrow,
          COALESCE(SUM(quantity) FILTER (WHERE transaction_type = 'return' AND created_at >= CURRENT_DATE - INTERVAL '7 days'), 0) as weekly_return,
          COALESCE(SUM(quantity) FILTER (WHERE transaction_type = 'do' AND created_at >= CURRENT_DATE - INTERVAL '7 days'), 0) as weekly_do
        FROM transactions
        WHERE cafe_id = $1`,
        [cafeId]
      );

      const stats = {
        totalScore: parseInt(pgResult.rows[0].total_score) || 0,
        totalCount: parseInt(pgResult.rows[0].total_count) || 0,
        today: parseInt(pgResult.rows[0].today) || 0,
        weekly: parseInt(pgResult.rows[0].weekly) || 0,
        totalBorrow: parseInt(pgResult.rows[0].total_borrow) || 0,
        totalReturn: parseInt(pgResult.rows[0].total_return) || 0,
        totalDo: parseInt(pgResult.rows[0].total_do) || 0,
        todayBorrow: parseInt(pgResult.rows[0].today_borrow) || 0,
        todayReturn: parseInt(pgResult.rows[0].today_return) || 0,
        todayDo: parseInt(pgResult.rows[0].today_do) || 0,
        weeklyBorrow: parseInt(pgResult.rows[0].weekly_borrow) || 0,
        weeklyReturn: parseInt(pgResult.rows[0].weekly_return) || 0,
        weeklyDo: parseInt(pgResult.rows[0].weekly_do) || 0
      };

      console.log('  ✅ PostgreSQL 통계 (웹 + QR 대여 + QR 적립):', stats);

      return stats;
    } catch (err) {
      console.error('❌ [getCafeStats] 에러:', err);
      throw err;
    }
  }

  // 카페별 거래 내역 조회 (페이징)
  static async getTransactionHistory(cafeId, limit = 50, offset = 0) {
    try {
      const result = await pool.query(
        `SELECT id, transaction_type, phone_number, quantity, score, is_new_user, created_at
         FROM transactions
         WHERE cafe_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [cafeId, limit, offset]
      );

      // 전화번호 마스킹 및 한글 변환 처리
      const masked = result.rows.map(row => ({
        ...row,
        phone_number: this.maskPhoneNumber(row.phone_number),
        transaction_type_kr: this.getTransactionTypeKorean(row.transaction_type)
      }));

      return masked;
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
          COALESCE(SUM(t.quantity) FILTER (WHERE t.transaction_type IN ('borrow', 'return', 'do')), 0) as total_transactions,
          COALESCE(SUM(t.quantity) FILTER (WHERE t.transaction_type IN ('borrow', 'return', 'do') AND DATE(t.created_at) = CURRENT_DATE), 0) as today_count,
          COALESCE(SUM(t.quantity) FILTER (WHERE t.transaction_type IN ('borrow', 'return', 'do') AND t.created_at >= CURRENT_DATE - INTERVAL '7 days'), 0) as weekly_count,
          COALESCE(SUM(t.score), 0) as total_score,
          COALESCE(SUM(t.quantity) FILTER (WHERE t.transaction_type = 'borrow'), 0) as total_borrow,
          COALESCE(SUM(t.quantity) FILTER (WHERE t.transaction_type = 'return'), 0) as total_return,
          COALESCE(SUM(t.quantity) FILTER (WHERE t.transaction_type = 'do'), 0) as total_do,
          COALESCE(SUM(t.quantity) FILTER (WHERE t.transaction_type = 'borrow' AND DATE(t.created_at) = CURRENT_DATE), 0) as today_borrow,
          COALESCE(SUM(t.quantity) FILTER (WHERE t.transaction_type = 'return' AND DATE(t.created_at) = CURRENT_DATE), 0) as today_return,
          COALESCE(SUM(t.quantity) FILTER (WHERE t.transaction_type = 'do' AND DATE(t.created_at) = CURRENT_DATE), 0) as today_do,
          COALESCE(SUM(t.quantity) FILTER (WHERE t.transaction_type = 'borrow' AND t.created_at >= CURRENT_DATE - INTERVAL '7 days'), 0) as weekly_borrow,
          COALESCE(SUM(t.quantity) FILTER (WHERE t.transaction_type = 'return' AND t.created_at >= CURRENT_DATE - INTERVAL '7 days'), 0) as weekly_return,
          COALESCE(SUM(t.quantity) FILTER (WHERE t.transaction_type = 'do' AND t.created_at >= CURRENT_DATE - INTERVAL '7 days'), 0) as weekly_do
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
        total_score: parseInt(row.total_score) || 0,
        total_borrow: parseInt(row.total_borrow) || 0,
        total_return: parseInt(row.total_return) || 0,
        total_do: parseInt(row.total_do) || 0,
        today_borrow: parseInt(row.today_borrow) || 0,
        today_return: parseInt(row.today_return) || 0,
        today_do: parseInt(row.today_do) || 0,
        weekly_borrow: parseInt(row.weekly_borrow) || 0,
        weekly_return: parseInt(row.weekly_return) || 0,
        weekly_do: parseInt(row.weekly_do) || 0
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

  // 관리자용: 특정 카페의 통계 초기화
  static async resetCafeStats(cafeId) {
    try {
      // Delete user behaviors for this cafe
      const behaviorsResult = await pool.query(
        'DELETE FROM user_behaviors WHERE cafe_id = $1',
        [cafeId]
      );

      // Delete transactions for this cafe
      const transactionsResult = await pool.query(
        'DELETE FROM transactions WHERE cafe_id = $1',
        [cafeId]
      );

      // Delete voice recognition stats for this cafe
      const voiceStatsResult = await pool.query(
        'DELETE FROM voice_recognition_stats WHERE cafe_id = $1',
        [cafeId]
      );

      const totalDeleted = behaviorsResult.rowCount + transactionsResult.rowCount + voiceStatsResult.rowCount;

      return {
        success: true,
        deletedCount: totalDeleted,
        deletedBehaviors: behaviorsResult.rowCount,
        deletedTransactions: transactionsResult.rowCount,
        deletedVoiceStats: voiceStatsResult.rowCount
      };
    } catch (err) {
      throw err;
    }
  }

  // 거래 상세 내역 조회 (개별 거래 내역)
  static async getTransactionDetails(cafeId, limit = 100, offset = 0, transactionType = null) {
    try {
      let query = `
        SELECT
          t.id,
          t.transaction_type,
          t.phone_number,
          t.quantity,
          t.score,
          t.is_new_user,
          t.created_at,
          c.cafe_name,
          c.cafe_id
        FROM transactions t
        JOIN cafes c ON t.cafe_id = c.id
        WHERE t.cafe_id = $1
      `;

      const params = [cafeId];

      // 타입 필터 (선택사항)
      if (transactionType) {
        query += ` AND t.transaction_type = $${params.length + 1}`;
        params.push(transactionType);
      }

      query += `
        ORDER BY t.created_at DESC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `;

      params.push(limit, offset);

      const result = await pool.query(query, params);

      // 전화번호 마스킹 처리
      const masked = result.rows.map(row => ({
        ...row,
        phone_number: this.maskPhoneNumber(row.phone_number),
        transaction_type_kr: this.getTransactionTypeKorean(row.transaction_type)
      }));

      return {
        success: true,
        data: masked,
        total: result.rowCount
      };
    } catch (error) {
      console.error('거래 상세 내역 조회 실패:', error);
      return { success: false, error: error.message };
    }
  }

  // 전화번호 마스킹 처리
  // DB에 이미 마스킹된 형태(010-0000-xxxx)로 저장되어 있으므로 그대로 반환
  static maskPhoneNumber(phone) {
    if (!phone) return '***-****-****';
    // 이미 마스킹된 형태면 그대로 반환 (010-0000-xxxx)
    if (phone.includes('0000')) return phone;
    // 혹시 마스킹되지 않은 형태가 있다면 마스킹 처리
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}-****-${digits.slice(-4)}`;
    }
    return '***-****-****';
  }

  // 액션 타입 한글 변환
  static getTransactionTypeKorean(type) {
    const types = {
      'borrow': '대여',
      'return': '반납',
      'do': '실천'
    };
    return types[type] || type;
  }

  // ============= Active Rentals 관리 =============

  // 대여 시 active_rentals에 추가 (또는 수량 증가)
  static async addActiveRental(cafeId, phoneNumber, quantity, rentalDate, expectedReturnDate, borrowTransactionId) {
    try {
      // UPSERT: 같은 전화번호가 이미 있으면 수량 증가, 없으면 새로 추가
      const result = await pool.query(`
        INSERT INTO active_rentals (
          cafe_id, phone_number, quantity,
          rental_date, expected_return_date,
          borrow_transaction_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (cafe_id, phone_number)
        DO UPDATE SET
          quantity = active_rentals.quantity + EXCLUDED.quantity,
          rental_date = EXCLUDED.rental_date,
          expected_return_date = EXCLUDED.expected_return_date,
          borrow_transaction_id = EXCLUDED.borrow_transaction_id
        RETURNING *
      `, [cafeId, phoneNumber, quantity, rentalDate, expectedReturnDate, borrowTransactionId]);

      return result.rows[0];
    } catch (error) {
      console.error('Error adding active rental:', error);
      throw error;
    }
  }

  // 반납 시 active_rentals에서 제거 (또는 수량 차감)
  static async removeActiveRental(cafeId, phoneNumber, quantity) {
    try {
      // 먼저 현재 대여 정보 조회
      const rental = await pool.query(`
        SELECT * FROM active_rentals
        WHERE cafe_id = $1 AND phone_number = $2
        ORDER BY rental_date ASC
        LIMIT 1
      `, [cafeId, phoneNumber]);

      if (rental.rows.length === 0) {
        console.warn(`⚠️ Active rental not found: cafe_id=${cafeId}, phone=${phoneNumber}`);
        return null;
      }

      const currentQty = rental.rows[0].quantity;

      if (quantity >= currentQty) {
        // 전체 반납: 레코드 삭제
        await pool.query(`
          DELETE FROM active_rentals
          WHERE cafe_id = $1 AND phone_number = $2
        `, [cafeId, phoneNumber]);
        return { action: 'deleted', quantity: currentQty };
      } else {
        // 부분 반납: 수량 차감
        const result = await pool.query(`
          UPDATE active_rentals
          SET quantity = quantity - $3
          WHERE cafe_id = $1 AND phone_number = $2
          RETURNING *
        `, [cafeId, phoneNumber, quantity]);
        return { action: 'updated', quantity: quantity, remaining: result.rows[0].quantity };
      }
    } catch (error) {
      console.error('Error removing active rental:', error);
      throw error;
    }
  }

  // 카페의 현재 대여 현황 조회 (실시간 상태 계산)
  static async getActiveRentals(cafeId, includeExpired = false) {
    try {
      let query = `
        SELECT
          id, cafe_id, phone_number, quantity,
          rental_date, expected_return_date,
          borrow_transaction_id, created_at,
          EXTRACT(DAY FROM (expected_return_date - NOW())) as days_remaining,
          CASE
            WHEN expected_return_date >= NOW() THEN 'active'
            WHEN expected_return_date < NOW() - INTERVAL '7 days' THEN 'expired'
            ELSE 'overdue'
          END as status
        FROM active_rentals
        WHERE cafe_id = $1
      `;

      if (!includeExpired) {
        query += ` AND expected_return_date >= NOW() - INTERVAL '7 days'`;
      }

      query += ` ORDER BY expected_return_date ASC`;

      const result = await pool.query(query, [cafeId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting active rentals:', error);
      throw error;
    }
  }

  // 모든 카페의 대여 현황 요약 (실시간 상태 계산)
  static async getAllActiveRentalsSummary() {
    try {
      const result = await pool.query(`
        WITH rental_status AS (
          SELECT
            cafe_id,
            phone_number,
            quantity,
            CASE
              WHEN expected_return_date >= NOW() THEN 'active'
              WHEN expected_return_date < NOW() - INTERVAL '7 days' THEN 'expired'
              ELSE 'overdue'
            END as status
          FROM active_rentals
        )
        SELECT
          c.id as cafe_id,
          c.cafe_name,
          c.cafe_id as cafe_username,
          c.total_cups,
          COALESCE(SUM(CASE WHEN rs.status IN ('active', 'overdue') THEN rs.quantity ELSE 0 END), 0) as rented_cups,
          COALESCE(SUM(CASE WHEN rs.status = 'expired' THEN rs.quantity ELSE 0 END), 0) as lost_cups,
          COALESCE(SUM(CASE WHEN rs.status = 'active' THEN rs.quantity ELSE 0 END), 0) as active_rentals,
          COALESCE(SUM(CASE WHEN rs.status = 'overdue' THEN rs.quantity ELSE 0 END), 0) as overdue_rentals,
          COALESCE(SUM(CASE WHEN rs.status = 'expired' THEN rs.quantity ELSE 0 END), 0) as expired_rentals,
          COUNT(DISTINCT rs.phone_number) FILTER (WHERE rs.status IN ('active', 'overdue')) as active_users
        FROM cafes c
        LEFT JOIN rental_status rs ON c.id = rs.cafe_id
        GROUP BY c.id, c.cafe_name, c.cafe_id, c.total_cups
        ORDER BY c.cafe_name
      `);

      return result.rows.map(row => ({
        cafe_id: row.cafe_id,
        cafe_name: row.cafe_name,
        cafe_username: row.cafe_username,
        total_cups: parseInt(row.total_cups) || 0,
        rented_cups: parseInt(row.rented_cups) || 0,
        lost_cups: parseInt(row.lost_cups) || 0,
        active_rentals: parseInt(row.active_rentals) || 0,
        overdue_rentals: parseInt(row.overdue_rentals) || 0,
        expired_rentals: parseInt(row.expired_rentals) || 0,
        active_users: parseInt(row.active_users) || 0,
        available_cups: (parseInt(row.total_cups) || 0) - ((parseInt(row.rented_cups) || 0) + (parseInt(row.lost_cups) || 0)),
        rental_rate: row.total_cups > 0 ? Math.round((parseInt(row.rented_cups) / parseInt(row.total_cups)) * 100) : 0
      }));
    } catch (error) {
      console.error('Error getting all active rentals summary:', error);
      throw error;
    }
  }

  // 카페의 컵 현황 조회 (실시간 상태 계산)
  static async getCupStatus(cafeId) {
    try {
      const result = await pool.query(`
        SELECT
          c.total_cups,
          COALESCE(SUM(CASE WHEN ar.expected_return_date >= NOW() OR (ar.expected_return_date < NOW() AND ar.expected_return_date >= NOW() - INTERVAL '7 days') THEN ar.quantity ELSE 0 END), 0) as rented_cups,
          COALESCE(SUM(CASE WHEN ar.expected_return_date < NOW() - INTERVAL '7 days' THEN ar.quantity ELSE 0 END), 0) as lost_cups,
          COALESCE(SUM(CASE WHEN ar.expected_return_date >= NOW() THEN ar.quantity ELSE 0 END), 0) as active_rentals,
          COALESCE(SUM(CASE WHEN ar.expected_return_date < NOW() AND ar.expected_return_date >= NOW() - INTERVAL '7 days' THEN ar.quantity ELSE 0 END), 0) as overdue_rentals,
          COALESCE(COUNT(DISTINCT CASE WHEN ar.phone_number IS NOT NULL AND (ar.expected_return_date >= NOW() OR (ar.expected_return_date < NOW() AND ar.expected_return_date >= NOW() - INTERVAL '7 days')) THEN ar.phone_number END), 0) as active_users
        FROM cafes c
        LEFT JOIN active_rentals ar ON c.id = ar.cafe_id
        WHERE c.id = $1
        GROUP BY c.id, c.total_cups
      `, [cafeId]);

      if (result.rows.length === 0) {
        return { total_cups: 0, rented_cups: 0, lost_cups: 0, available_cups: 0, rental_rate: 0, active_users: 0 };
      }

      const row = result.rows[0];
      const totalCups = row.total_cups || 0;
      const rentedCups = parseInt(row.rented_cups);
      const lostCups = parseInt(row.lost_cups);
      const availableCups = totalCups - rentedCups - lostCups;
      const rentalRate = totalCups > 0 ? Math.round((rentedCups / totalCups) * 100) : 0;

      return {
        total_cups: totalCups,
        rented_cups: rentedCups,
        lost_cups: lostCups,
        available_cups: availableCups,
        rental_rate: rentalRate,
        active_rentals: parseInt(row.active_rentals),
        overdue_rentals: parseInt(row.overdue_rentals),
        active_users: parseInt(row.active_users)
      };
    } catch (error) {
      console.error('Error getting cup status:', error);
      throw error;
    }
  }

  // 카페의 총 컵 개수 업데이트
  static async updateTotalCups(cafeId, totalCups) {
    try {
      const result = await pool.query(`
        UPDATE cafes
        SET total_cups = $1
        WHERE id = $2
        RETURNING *
      `, [totalCups, cafeId]);

      if (result.rows.length === 0) {
        throw new Error('Cafe not found');
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error updating total cups:', error);
      throw error;
    }
  }
}

module.exports = Statistics;
