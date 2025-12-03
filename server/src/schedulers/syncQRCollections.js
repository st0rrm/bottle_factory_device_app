const { db, FieldValue } = require('../config/firebase');
const pool = require('../config/database');
const Statistics = require('../models/Statistics');

/**
 * QR 적립(반납)을 Firebase에서 PostgreSQL로 실시간 동기화
 * - Firebase collect_history 컬렉션 실시간 리스너
 * - 새 QR 적립 생성 시 즉시 PostgreSQL에 기록
 * - Firebase 문서에 pg_synced 플래그 설정
 */

let listener = null;
const syncingDocs = new Set(); // 현재 동기화 중인 문서 ID 추적 (중복 방지)

/**
 * 단일 QR 적립을 PostgreSQL에 동기화
 */
async function syncSingleCollection(docId, data) {
  // 이미 동기화 중이면 스킵
  if (syncingDocs.has(docId)) {
    return;
  }

  // 웹 적립은 제외 (이미 백엔드에서 처리됨)
  if (data.source === 'web') {
    return;
  }

  // 이미 동기화된 문서는 스킵
  if (data.pg_synced === true) {
    return;
  }

  syncingDocs.add(docId);

  try {
    const shopId = data.shop_id;
    const score = data.score || 0;
    const RETURNMECUP_ITEM_ID = 'AESpVawGP202Tg4QOmvH'; // 리턴미컵(텀블러) 아이템 ID

    // collect_items로 반납/실천 판단
    let actionType = 'return'; // 기본값
    try {
      const collectItemsSnapshot = await db.collection('collect_history')
        .doc(docId)
        .collection('collect_items')
        .doc(RETURNMECUP_ITEM_ID)
        .get();

      // 리턴미컵 아이템이 있고 score가 10점이면 반납, 아니면 실천
      const isReturn = collectItemsSnapshot.exists && score === 10;
      actionType = isReturn ? 'return' : 'do';
    } catch (itemError) {
      console.warn(`⚠️ [syncQRCollection] collect_items 확인 실패: ${docId}`, itemError);
      // 에러 시 기본값 'return' 사용
    }

    // 가게 정보 조회
    const shopDoc = await db.collection('shops').doc(shopId).get();
    if (!shopDoc.exists) {
      console.warn(`⚠️ [syncQRCollection] shop not found: ${shopId}`);
      await db.collection('collect_history').doc(docId).update({
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
      console.warn(`⚠️ [syncQRCollection] cafe not found: ${shopName}`);
      await db.collection('collect_history').doc(docId).update({
        pg_synced: true,
        pg_sync_error: 'cafe_not_found'
      });
      syncingDocs.delete(docId);
      return;
    }

    const cafeId = cafeResult.rows[0].id;

    // PostgreSQL에 transaction 기록 (적립 점수만 - 카운트는 syncQRRentals에서 처리)
    // quantity=0으로 설정하여 반납/실천 카운트 중복 방지
    const transactionType = actionType === 'do' ? 'do' : 'return';
    await Statistics.addTransaction(
      cafeId,
      transactionType,  // 'return' 또는 'do'
      null,             // QR 적립은 전화번호 없음
      0,                // 0 - 카운트 제외 (적립 점수만 기록, 반납 카운트는 syncQRRentals에서)
      score,            // collect_history의 score
      false,            // isNewUser: QR 스캔 = 앱 설치 기존 유저
      'qr'              // source: QR 스캔
    );

    // Firebase에 동기화 플래그 설정
    await db.collection('collect_history').doc(docId).update({
      pg_synced: true,
      pg_synced_at: FieldValue.serverTimestamp()
    });

    const actionLabel = transactionType === 'do' ? '실천' : '반납';
    console.log(`✅ [syncQRCollection] 실시간 동기화 완료: ${docId} (${shopName}) ${actionLabel} +${score}점`);

  } catch (error) {
    console.error(`❌ [syncQRCollection] 동기화 실패: ${docId}`, error);

    // 에러 정보 기록
    try {
      await db.collection('collect_history').doc(docId).update({
        pg_synced: true, // 에러난 것도 플래그 설정 (무한 재시도 방지)
        pg_sync_error: error.message
      });
    } catch (flagError) {
      console.error(`❌ [syncQRCollection] 플래그 설정 실패: ${docId}`, flagError);
    }
  } finally {
    syncingDocs.delete(docId);
  }
}

/**
 * 기존에 동기화되지 않은 QR 적립을 일괄 동기화 (서버 시작 시)
 */
async function syncExistingCollections() {
  try {
    console.log('🔄 [syncQRCollections] 기존 미동기화 적립 일괄 처리 시작...');

    // pg_synced=false인 문서 조회
    const unsyncedQuery = await db.collection('collect_history')
      .where('pg_synced', '==', false)
      .limit(100)
      .get();

    console.log(`🔥 [syncQRCollections] 미동기화 적립: ${unsyncedQuery.size}개`);

    let syncedCount = 0;
    for (const doc of unsyncedQuery.docs) {
      await syncSingleCollection(doc.id, doc.data());
      syncedCount++;
    }

    console.log(`✅ [syncQRCollections] 기존 미동기화 적립 처리 완료: ${syncedCount}개`);
  } catch (error) {
    console.error('❌ [syncQRCollections] 기존 적립 동기화 오류:', error);
  }
}

/**
 * Firebase 실시간 리스너 시작
 */
function startRealtimeListener() {
  console.log('🚀 [syncQRCollections] 실시간 리스너 시작');

  // 먼저 기존 미동기화 적립 처리
  syncExistingCollections();

  // 실시간 리스너 설정 - 새로운 적립만 감지
  const now = new Date();

  listener = db.collection('collect_history')
    .where('create', '>', now) // 지금 이후 생성된 것만
    .onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          if (change.type === 'added') {
            const doc = change.doc;
            const data = doc.data();

            console.log(`🆕 [syncQRCollections] 새 적립 감지: ${doc.id}`);

            // QR 적립인지 확인 후 동기화
            if (data.source !== 'web' && data.pg_synced !== true) {
              await syncSingleCollection(doc.id, data);
            }
          }
        });
      },
      (error) => {
        console.error('❌ [syncQRCollections] 리스너 에러:', error);
        // 에러 발생 시 10초 후 재시작
        setTimeout(() => {
          console.log('🔄 [syncQRCollections] 리스너 재시작 시도...');
          stopListener();
          startRealtimeListener();
        }, 10000);
      }
    );

  console.log('✅ [syncQRCollections] 실시간 리스너 시작 완료');
}

/**
 * 리스너 중지
 */
function stopListener() {
  if (listener) {
    listener();
    listener = null;
    console.log('🛑 [syncQRCollections] 리스너 중지됨');
  }
}

/**
 * 스케줄러 시작 (실시간 리스너 시작)
 */
function startScheduler() {
  startRealtimeListener();
}

module.exports = { startScheduler, stopListener };
