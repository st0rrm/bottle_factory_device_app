const { db, FieldValue } = require('../config/firebase');
const pool = require('../config/database');
const Statistics = require('../models/Statistics');

/**
 * QR 대여를 Firebase에서 PostgreSQL로 실시간 동기화
 * - Firebase rents 컬렉션 실시간 리스너
 * - 새 QR 대여 생성 시 즉시 PostgreSQL에 기록
 * - Firebase 문서에 pg_synced 플래그 설정
 */

let listener = null;
const syncingDocs = new Set(); // 현재 동기화 중인 문서 ID 추적 (중복 방지)

/**
 * 단일 QR 대여를 PostgreSQL에 동기화
 */
async function syncSingleRental(docId, data) {
  // 이미 동기화 중이면 스킵
  if (syncingDocs.has(docId)) {
    return;
  }

  // 웹 대여는 제외 (이미 백엔드에서 처리됨)
  if (data.source === 'web') {
    return;
  }

  // 이미 동기화된 문서는 스킵
  if (data.pg_synced === true) {
    return;
  }

  syncingDocs.add(docId);

  try {
    const rentedShopId = data.rented_shop_id;

    // 가게 정보 조회
    const shopDoc = await db.collection('shops').doc(rentedShopId).get();
    if (!shopDoc.exists) {
      console.warn(`⚠️ [syncQRRental] shop not found: ${rentedShopId}`);
      await db.collection('rents').doc(docId).update({
        pg_synced: true,
        pg_sync_error: 'shop_not_found'
      });
      syncingDocs.delete(docId);
      return;
    }

    const shopName = shopDoc.data().name;

    // PostgreSQL에서 카페 ID 조회
    const cafeResult = await pool.query(
      'SELECT id FROM cafes WHERE cafe_name = $1',
      [shopName]
    );

    if (cafeResult.rows.length === 0) {
      console.warn(`⚠️ [syncQRRental] cafe not found: ${shopName}`);
      await db.collection('rents').doc(docId).update({
        pg_synced: true,
        pg_sync_error: 'cafe_not_found'
      });
      syncingDocs.delete(docId);
      return;
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
    await db.collection('rents').doc(docId).update({
      pg_synced: true,
      pg_synced_at: FieldValue.serverTimestamp()
    });

    console.log(`✅ [syncQRRental] 실시간 동기화 완료: ${docId} (${shopName}) +30점`);

  } catch (error) {
    console.error(`❌ [syncQRRental] 동기화 실패: ${docId}`, error);

    // 에러 정보 기록
    try {
      await db.collection('rents').doc(docId).update({
        pg_synced: true, // 에러난 것도 플래그 설정 (무한 재시도 방지)
        pg_sync_error: error.message
      });
    } catch (flagError) {
      console.error(`❌ [syncQRRental] 플래그 설정 실패: ${docId}`, flagError);
    }
  } finally {
    syncingDocs.delete(docId);
  }
}

/**
 * 기존에 동기화되지 않은 QR 대여를 일괄 동기화 (서버 시작 시)
 */
async function syncExistingRentals() {
  try {
    console.log('🔄 [syncQRRentals] 기존 미동기화 대여 일괄 처리 시작...');

    // pg_synced=false인 문서 조회
    const unsyncedQuery = await db.collection('rents')
      .where('pg_synced', '==', false)
      .limit(50)
      .get();

    console.log(`📱 [syncQRRentals] 미동기화 대여: ${unsyncedQuery.size}개`);

    let syncedCount = 0;
    for (const doc of unsyncedQuery.docs) {
      await syncSingleRental(doc.id, doc.data());
      syncedCount++;
    }

    console.log(`✅ [syncQRRentals] 기존 미동기화 대여 처리 완료: ${syncedCount}개`);
  } catch (error) {
    console.error('❌ [syncQRRentals] 기존 대여 동기화 오류:', error);
  }
}

/**
 * Firebase 실시간 리스너 시작
 */
function startRealtimeListener() {
  console.log('🚀 [syncQRRentals] 실시간 리스너 시작');

  // 먼저 기존 미동기화 대여 처리
  syncExistingRentals();

  // 실시간 리스너 설정 - 새로운 대여만 감지
  const now = new Date();

  listener = db.collection('rents')
    .where('rented_date', '>', now) // 지금 이후 생성된 것만
    .onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const doc = change.doc;
            const data = doc.data();

            console.log(`🆕 [syncQRRentals] 새 대여 감지: ${doc.id}`);

            // QR 대여인지 확인 후 동기화
            if (data.source !== 'web' && data.pg_synced !== true) {
              await syncSingleRental(doc.id, data);
            }
          }
        });
      },
      (error) => {
        console.error('❌ [syncQRRentals] 리스너 에러:', error);
        // 에러 발생 시 10초 후 재시작
        setTimeout(() => {
          console.log('🔄 [syncQRRentals] 리스너 재시작 시도...');
          stopListener();
          startRealtimeListener();
        }, 10000);
      }
    );

  console.log('✅ [syncQRRentals] 실시간 리스너 시작 완료');
}

/**
 * 리스너 중지
 */
function stopListener() {
  if (listener) {
    listener();
    listener = null;
    console.log('🛑 [syncQRRentals] 리스너 중지됨');
  }
}

/**
 * 스케줄러 시작 (실시간 리스너 시작)
 */
function startScheduler() {
  startRealtimeListener();
}

module.exports = { startScheduler, stopListener };
