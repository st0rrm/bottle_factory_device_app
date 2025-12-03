const pool = require('../src/config/database');

/**
 * 2025-11-27 이전 QR transaction 정리
 * ⚠️ PostgreSQL transactions 테이블만 삭제 (Firebase는 절대 건드리지 않음)
 * - 서버 시작 시 과거 데이터까지 모두 동기화되어 통계가 부풀려진 문제 해결
 */

async function cleanupOldQRTransactions() {
  const cutoffDate = '2025-11-27 00:00:00';

  try {
    console.log('🔄 [Cleanup] PostgreSQL QR transaction 정리 시작...');
    console.log('⚠️ Firebase는 건드리지 않습니다 (PostgreSQL만 정리)');

    // 1. 정리 전 통계
    const beforeStats = await pool.query(`
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

    console.log('\n📊 [정리 전] QR transaction 통계:');
    console.table(beforeStats.rows);

    // 2. 삭제 대상 확인
    const toDelete = await pool.query(`
      SELECT
        cafe_id,
        transaction_type,
        COUNT(*) as count
      FROM transactions
      WHERE source = 'qr' AND created_at < $1
      GROUP BY cafe_id, transaction_type
      ORDER BY cafe_id, transaction_type
    `, [cutoffDate]);

    console.log(`\n🗑️ [삭제 대상] ${cutoffDate} 이전 데이터:`);
    console.table(toDelete.rows);

    const totalToDelete = await pool.query(`
      SELECT COUNT(*) as total
      FROM transactions
      WHERE source = 'qr' AND created_at < $1
    `, [cutoffDate]);

    console.log(`\n📈 총 ${totalToDelete.rows[0].total}개 레코드 삭제 예정`);

    // 3. 사용자 확인
    const shouldDelete = process.argv[2] === '--confirm';

    if (!shouldDelete) {
      console.log('\n⚠️ 실제 삭제를 원하면 다음 명령어를 실행하세요:');
      console.log('node server/scripts/cleanupDuplicateTransactions.js --confirm');
      console.log('\n💡 Firebase는 건드리지 않으니 안심하세요!');
      return;
    }

    // 4. PostgreSQL에서만 삭제 (Firebase 절대 건드리지 않음)
    console.log(`\n🚀 [삭제 시작] ${cutoffDate} 이전 QR transaction 삭제 중...`);

    const deleteResult = await pool.query(`
      DELETE FROM transactions
      WHERE source = 'qr' AND created_at < $1
    `, [cutoffDate]);

    console.log(`\n✅ [삭제 완료] ${deleteResult.rowCount}개 레코드 삭제됨`);

    // 5. 정리 후 통계
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

    console.log('\n📊 [정리 후] QR transaction 통계:');
    console.table(afterStats.rows);

    console.log('\n✅ [완료] PostgreSQL 정리 완료 (Firebase는 그대로 유지됨)');

  } catch (error) {
    console.error('❌ [Cleanup] 에러:', error);
  } finally {
    await pool.end();
  }
}

cleanupOldQRTransactions();
