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
  // 이미 동기화 중이면 스킵
  if (syncingDocs.has(docId)) {
    return;
  }

  // 웹 대여는 제외 (이미 백엔드에서 처리됨)
  if (data.source === 'web') {
    return;
  }

  // 반납 업데이트가 아닌 경우에만 pg_synced 체크
  if (!isReturnUpdate && data.pg_synced === true) {
    return;
  }

  syncingDocs.add(docId);

  try {
    const rentedShopId = data.rented_shop_id;
    const userUid = data.uid;
    const status = data.status; // 'rent' or 'return'

    // 사용자 정보 조회 (전화번호 확인)
    const userDoc = await db.collection('users').doc(userUid).get();
    if (!userDoc.exists) {
      console.warn(`⚠️ [syncQRRental] user not found: ${userUid}`);
      await db.collection('rents').doc(docId).update({
        pg_synced: true,
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

    // Firebase에 동기화 플래그 설정 (반납은 pg_return_synced 플래그 추가)
    const updateData = {
      pg_synced: true,
      pg_synced_at: FieldValue.serverTimestamp()
    };

    if (status === 'return') {
      updateData.pg_return_synced = true;
    }

    await db.collection('rents').doc(docId).update(updateData);

    console.log(`✅ [syncQRRental] 실시간 동기화 완료: ${docId} (${shopName}) ${transactionType} - ${maskedPhone}`);

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

  // 실시간 리스너 설정 - 새로운 대여와 반납 모두 감지
  const now = new Date();

  listener = db.collection('rents')
    .where('rented_date', '>', now) // 지금 이후 생성된 것만
    .onSnapshot(
      (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
          const doc = change.doc;
          const data = doc.data();

          // added: 새 대여, modified: 반납 업데이트
          if (change.type === 'added' || change.type === 'modified') {
            const isReturnUpdate = change.type === 'modified' && data.status === 'return';

            console.log(`🆕 [syncQRRentals] ${change.type === 'added' ? '새 대여' : '반납 업데이트'} 감지: ${doc.id} (status: ${data.status})`);

            // QR 대여/반납인지 확인 후 동기화
            if (data.source !== 'web') {
              // 반납 업데이트는 pg_return_synced 체크, 대여는 pg_synced 체크
              const shouldSync = isReturnUpdate
                ? !data.pg_return_synced
                : !data.pg_synced;

              if (shouldSync) {
                await syncSingleRental(doc.id, data, isReturnUpdate);
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
