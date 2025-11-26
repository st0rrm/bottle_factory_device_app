const cron = require('node-cron');
const { db, FieldValue } = require('../config/firebase');
const pool = require('../config/database');
const Statistics = require('../models/Statistics');

/**
 * QR 대여를 Firebase에서 PostgreSQL로 실시간 동기화하는 스케줄러
 * - 1분마다 실행
 * - Firebase rents 컬렉션에서 아직 동기화되지 않은 QR 대여 찾기
 * - PostgreSQL transactions 테이블에 기록
 * - Firebase 문서에 pg_synced 플래그 설정
 */

let isRunning = false;

async function syncQRRentals() {
  // 이미 실행 중이면 스킵 (중복 실행 방지)
  if (isRunning) {
    console.log('⏭️ [syncQRRentals] 이미 실행 중, 스킵');
    return;
  }

  isRunning = true;

  try {
    console.log('🔄 [syncQRRentals] 시작:', new Date().toISOString());

    // 1. Firebase에서 아직 동기화되지 않은 QR 대여 찾기
    const unsyncedQuery = await db.collection('rents')
      .where('pg_synced', '==', false)
      .limit(100) // 한 번에 최대 100개
      .get();

    // pg_synced 필드가 없는 문서도 찾기 (기존 문서)
    const noFlagQuery = await db.collection('rents')
      .where('source', '!=', 'web')
      .limit(50)
      .get();

    const unsyncedDocs = [];

    // pg_synced=false인 문서 추가
    unsyncedQuery.forEach(doc => {
      const data = doc.data();
      if (data.source !== 'web') { // 웹 대여 제외
        unsyncedDocs.push({ id: doc.id, data });
      }
    });

    // pg_synced 필드가 없는 문서 중 아직 추가 안 된 것 찾기
    noFlagQuery.forEach(doc => {
      const data = doc.data();
      if (data.pg_synced === undefined && !unsyncedDocs.find(d => d.id === doc.id)) {
        unsyncedDocs.push({ id: doc.id, data });
      }
    });

    if (unsyncedDocs.length === 0) {
      console.log('✅ [syncQRRentals] 동기화할 QR 대여 없음');
      isRunning = false;
      return;
    }

    console.log(`📱 [syncQRRentals] 동기화할 QR 대여: ${unsyncedDocs.length}개`);

    let syncedCount = 0;
    let errorCount = 0;

    // 2. 각 대여를 PostgreSQL에 기록
    for (const { id, data } of unsyncedDocs) {
      try {
        const rentedShopId = data.rented_shop_id;

        // 가게 정보 조회
        const shopDoc = await db.collection('shops').doc(rentedShopId).get();
        if (!shopDoc.exists) {
          console.warn(`⚠️ [syncQRRentals] shop not found: ${rentedShopId}`);
          // 동기화 플래그는 설정해서 다음에 다시 시도하지 않도록
          await db.collection('rents').doc(id).update({
            pg_synced: true,
            pg_sync_error: 'shop_not_found'
          });
          continue;
        }

        const shopName = shopDoc.data().name;

        // PostgreSQL에서 카페 ID 조회
        const cafeResult = await pool.query(
          'SELECT id FROM cafes WHERE cafe_name = $1',
          [shopName]
        );

        if (cafeResult.rows.length === 0) {
          console.warn(`⚠️ [syncQRRentals] cafe not found: ${shopName}`);
          // 동기화 플래그 설정
          await db.collection('rents').doc(id).update({
            pg_synced: true,
            pg_sync_error: 'cafe_not_found'
          });
          continue;
        }

        const cafeId = cafeResult.rows[0].id;

        // PostgreSQL에 transaction 기록 (QR 대여 = 30점)
        await Statistics.addTransaction(
          cafeId,
          'borrow',
          null, // QR 대여는 전화번호 없음
          1,    // 1개 대여
          30    // 30점
        );

        // Firebase에 동기화 플래그 설정
        await db.collection('rents').doc(id).update({
          pg_synced: true,
          pg_synced_at: FieldValue.serverTimestamp()
        });

        syncedCount++;
        console.log(`✅ [syncQRRentals] 동기화 완료: ${id} (${shopName})`);

      } catch (error) {
        console.error(`❌ [syncQRRentals] 동기화 실패: ${id}`, error);
        errorCount++;

        // 에러 정보 기록
        try {
          await db.collection('rents').doc(id).update({
            pg_synced: true, // 에러난 것도 플래그 설정 (무한 재시도 방지)
            pg_sync_error: error.message
          });
        } catch (flagError) {
          console.error(`❌ [syncQRRentals] 플래그 설정 실패: ${id}`, flagError);
        }
      }
    }

    console.log(`🎉 [syncQRRentals] 완료: 성공 ${syncedCount}개, 실패 ${errorCount}개`);

  } catch (error) {
    console.error('❌ [syncQRRentals] 전체 에러:', error);
  } finally {
    isRunning = false;
  }
}

// 1분마다 실행
function startScheduler() {
  console.log('🚀 [syncQRRentals] 스케줄러 시작 (1분마다 실행)');

  // 서버 시작 시 즉시 한 번 실행
  syncQRRentals();

  // 1분마다 실행
  cron.schedule('*/1 * * * *', () => {
    syncQRRentals();
  });
}

module.exports = { startScheduler, syncQRRentals };
