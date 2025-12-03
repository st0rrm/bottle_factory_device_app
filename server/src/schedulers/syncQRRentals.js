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
 * Mask phone number for privacy (010-0000-xxxx format)
 * Same format as used in routes/users.js for consistency
 */
function maskPhoneNumber(phone) {
  if (!phone) return null;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Check if valid Korean mobile number (11 digits starting with 010)
  if (digits.length !== 11 || !digits.startsWith('010')) {
    return null;
  }

  // Extract last 4 digits
  const lastFour = digits.slice(-4);

  // Return masked format: 010-0000-xxxx
  return `010-0000-${lastFour}`;
}

/**
 * 단일 QR 대여를 PostgreSQL에 동기화
 */
async function syncSingleRental(docId, data, isReturnUpdate = false) {
  // 반납 업데이트가 아닌 경우에만 pg_synced 체크
  // (대여는 pg_synced, 반납은 pg_return_synced로 중복 방지)
  if (!isReturnUpdate && data.pg_synced === true) {
    return;
  }

  // 반납 업데이트인 경우 pg_return_synced 체크
  if (isReturnUpdate && data.pg_return_synced === true) {
    return;
  }

  // 이미 동기화 중이면 스킵
  if (syncingDocs.has(docId)) {
    console.log(`⏭️ [syncQRRental] 이미 동기화 중: ${docId}`);
    return;
  }

  syncingDocs.add(docId);

  // 즉시 Firebase에 플래그 설정 (다른 중복 이벤트 방지)
  try {
    const flagUpdate = isReturnUpdate
      ? { pg_return_synced: true }
      : { pg_synced: true };

    await db.collection('rents').doc(docId).update(flagUpdate);
  } catch (flagError) {
    console.error(`❌ [syncQRRental] 플래그 설정 실패: ${docId}`, flagError);
    syncingDocs.delete(docId);
    return;
  }

  try {
    const rentedShopId = data.rented_shop_id;
    const userUid = data.uid;
    const status = data.status; // 'rent' or 'return'

    // 사용자 정보 조회 (전화번호 확인)
    const userDoc = await db.collection('users').doc(userUid).get();
    if (!userDoc.exists) {
      console.warn(`⚠️ [syncQRRental] user not found: ${userUid}`);
      await db.collection('rents').doc(docId).update({
        pg_sync_error: 'user_not_found'
      });
      syncingDocs.delete(docId);
      return;
    }

    const userData = userDoc.data();
    const userPhone = userData.mobile;
    const maskedPhone = maskPhoneNumber(userPhone);

    // 가게 정보 조회
    const shopDoc = await db.collection('shops').doc(rentedShopId).get();
    if (!shopDoc.exists) {
      console.warn(`⚠️ [syncQRRental] shop not found: ${rentedShopId}`);
      await db.collection('rents').doc(docId).update({
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
        pg_sync_error: 'cafe_not_found'
      });
      syncingDocs.delete(docId);
      return;
    }

    const cafeId = cafeResult.rows[0].id;

    // status에 따라 대여 또는 반납 처리
    const transactionType = status === 'return' ? 'return' : 'borrow';

    // PostgreSQL에 transaction 기록 (QR 대여/반납 - 적립 없음)
    // 마스킹된 전화번호를 phone_number로 저장 (웹 앱과 동일한 형식으로 active_rentals 매칭 가능)
    await Statistics.addTransaction(
      cafeId,
      transactionType,
      maskedPhone,  // 마스킹된 전화번호 사용 (크로스 반납 지원)
      1,     // 1개 대여/반납
      0,     // 적립 없음
      false, // isNewUser: QR 스캔 = 앱 설치 기존 유저
      'qr'   // source: QR 스캔
    );

    // 동기화 완료 타임스탬프 추가 (플래그는 이미 함수 시작 시 설정됨)
    await db.collection('rents').doc(docId).update({
      pg_synced_at: FieldValue.serverTimestamp()
    });

    console.log(`✅ [syncQRRental] 실시간 동기화 완료: ${docId} (${shopName}) ${transactionType} - ${maskedPhone}`);

  } catch (error) {
    console.error(`❌ [syncQRRental] 동기화 실패: ${docId}`, error);

    // 에러 정보 기록 (플래그는 이미 설정됨)
    try {
      await db.collection('rents').doc(docId).update({
        pg_sync_error: error.message
      });
    } catch (flagError) {
      console.error(`❌ [syncQRRental] 에러 정보 기록 실패: ${docId}`, flagError);
    }
  } finally {
    syncingDocs.delete(docId);
  }
}

/**
 * 기존에 동기화되지 않은 QR 대여를 일괄 동기화 (서버 시작 시)
 * 현재 대여 중인 문서만 처리 (이미 반납된 과거 데이터는 무시)
 */
async function syncExistingRentals() {
  try {
    console.log('🔄 [syncQRRentals] 기존 미동기화 대여 일괄 처리 시작...');

    // status='rent'이고 source가 'web'이 아닌 문서만 조회 (현재 대여 중인 것만)
    const activeRentalsQuery = await db.collection('rents')
      .where('status', '==', 'rent')
      .where('source', '!=', 'web')
      .orderBy('source')
      .orderBy('rented_date', 'desc')
      .limit(100)
      .get();

    console.log(`📱 [syncQRRentals] 현재 대여 중인 QR 문서: ${activeRentalsQuery.size}개`);

    let syncedCount = 0;
    let skippedCount = 0;

    for (const doc of activeRentalsQuery.docs) {
      const data = doc.data();

      // pg_synced가 없거나 false인 경우만 동기화
      if (!data.pg_synced) {
        console.log(`  🔄 대여 동기화: ${doc.id}`);
        await syncSingleRental(doc.id, data, false);
        syncedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`✅ [syncQRRentals] 기존 미동기화 대여 처리 완료: 동기화 ${syncedCount}개, 스킵 ${skippedCount}개`);
  } catch (error) {
    console.error('❌ [syncQRRentals] 기존 대여 동기화 오류:', error);
  }
}

/**
 * Firebase 실시간 리스너 시작
 */
function startRealtimeListener() {
  // 이미 리스너가 실행 중이면 중복 시작 방지
  if (listener) {
    console.log('⚠️ [syncQRRentals] 리스너가 이미 실행 중입니다. 중복 시작 방지.');
    return;
  }

  console.log('🚀 [syncQRRentals] 실시간 리스너 시작');

  // 먼저 기존 미동기화 대여 처리
  syncExistingRentals();

  // 실시간 리스너 설정 - status='rent'인 문서만 감시
  // (새 대여 추가 + 기존 대여의 반납 업데이트 모두 감지)
  // source 필터 제거: 크로스 플랫폼 반납 지원 (웹→QR, QR→웹)
  listener = db.collection('rents')
    .where('status', '==', 'rent')  // 현재 대여 중인 것만 (과거 반납 문서 제외)
    .orderBy('rented_date', 'desc')
    .onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          const doc = change.doc;
          const data = doc.data();

          // added: 새 대여
          // removed: 반납 (status=rent 쿼리에서 벗어남)
          if (change.type === 'added') {
            console.log(`🆕 [syncQRRentals] 새 대여 감지: ${doc.id} (status: ${data.status}, source: ${data.source})`);

            // 중복 처리 방지: 웹 대여는 이미 routes/users.js에서 처리됨
            if (data.source === 'web') {
              console.log(`  ⏭️ 스킵: 웹 대여는 이미 routes/users.js에서 처리됨`);
              return;
            }

            // pg_synced가 없거나 false인 경우만 동기화
            if (!data.pg_synced) {
              await syncSingleRental(doc.id, data, false);
            }
          } else if (change.type === 'removed') {
            // status=rent → return으로 변경되어 쿼리에서 제거됨 = 반납
            console.log(`📤 [syncQRRentals] 반납 감지 (쿼리 제거): ${doc.id} (status: ${data.status}, source: ${data.source})`);

            // 문서 다시 조회해서 최신 상태 확인 (status=return인지)
            const freshDoc = await db.collection('rents').doc(doc.id).get();
            if (freshDoc.exists) {
              const freshData = freshDoc.data();
              if (freshData.status === 'return' && !freshData.pg_return_synced) {
                await syncSingleRental(doc.id, freshData, true);
              }
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
