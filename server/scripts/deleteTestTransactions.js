const pool = require('../src/config/database');

/**
 * 2025-12-03 10:15~10:20 사이 테스트 거래 삭제
 * - 서버 테스트 중 생성된 과거 데이터 일괄 삭제
 * - Firebase는 건드리지 않음
 */

async function deleteTestTransactions() {
  // PostgreSQL은 UTC로 저장됨 (KST - 9시간)
  // KST 2025-12-03 22:17 = UTC 2025-12-03 13:17
  const startTime = '2025-12-03 13:17:00';  // UTC (KST 22:17)
  const endTime = '2025-12-03 13:19:00';    // UTC (KST 22:19)

  try {
    console.log('🔄 [Delete] 테스트 거래 삭제 시작...');
    console.log(`⏰ 삭제 범위: ${startTime} ~ ${endTime}`);

    // 1. 삭제 전 확인
    const beforeCheck = await pool.query(`
      SELECT
        cafe_id,
        transaction_type,
        COUNT(*) as count
      FROM transactions
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY cafe_id, transaction_type
      ORDER BY cafe_id, transaction_type
    `, [startTime, endTime]);

    console.log('\n📊 [삭제 대상] 해당 시간대 거래:');
    console.table(beforeCheck.rows);

    const totalCount = await pool.query(`
      SELECT COUNT(*) as total FROM transactions
      WHERE created_at >= $1 AND created_at <= $2
    `, [startTime, endTime]);

    console.log(`\n📈 총 ${totalCount.rows[0].total}개 레코드 삭제 예정`);

    // 2. 사용자 확인
    const shouldDelete = process.argv[2] === '--confirm';

    if (!shouldDelete) {
      console.log('\n⚠️ 실제 삭제를 원하면 다음 명령어를 실행하세요:');
      console.log('node server/scripts/deleteTestTransactions.js --confirm');
      return;
    }

    // 3. 삭제 실행 (active_rentals 먼저, 그 다음 transactions)
    console.log('\n🚀 [삭제 시작] 관련 active_rentals 먼저 삭제 중...');

    // 3-1. 먼저 active_rentals에서 해당 transaction을 참조하는 레코드 삭제
    const activeRentalsDelete = await pool.query(`
      DELETE FROM active_rentals
      WHERE borrow_transaction_id IN (
        SELECT id FROM transactions
        WHERE created_at >= $1 AND created_at <= $2
      )
    `, [startTime, endTime]);

    console.log(`✅ [active_rentals 삭제] ${activeRentalsDelete.rowCount}개 레코드 삭제됨`);

    // 3-2. transactions 삭제
    console.log('\n🚀 [삭제 시작] 테스트 거래 삭제 중...');

    const deleteResult = await pool.query(`
      DELETE FROM transactions
      WHERE created_at >= $1 AND created_at <= $2
    `, [startTime, endTime]);

    console.log(`\n✅ [삭제 완료] ${deleteResult.rowCount}개 레코드 삭제됨`);

    // 4. 삭제 후 통계 확인
    const afterStats = await pool.query(`
      SELECT
        cafe_id,
        transaction_type,
        COUNT(*) as count,
        MIN(created_at) as first_date,
        MAX(created_at) as last_date
      FROM transactions
      WHERE source = 'qr'
      GROUP BY cafe_id, transaction_type
      ORDER BY cafe_id, transaction_type
    `);

    console.log('\n📊 [삭제 후] QR transaction 통계:');
    console.table(afterStats.rows);

    console.log('\n✅ [완료] 통계는 자동으로 재계산됩니다 (새로고침 필요)');

  } catch (error) {
    console.error('❌ [Delete] 에러:', error);
  } finally {
    await pool.end();
  }
}

deleteTestTransactions();
