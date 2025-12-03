/**
 * Active Rentals 정리 스크립트
 *
 * 목적: phone_number 필드에 'uid:xxx' 형식으로 저장된 잘못된 데이터를 정리
 *
 * 실행 방법:
 *   node server/scripts/cleanupActiveRentals.js
 */

const pool = require('../src/config/database');
const { db } = require('../src/config/firebase');

/**
 * Mask phone number for privacy (010-0000-xxxx format)
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

async function cleanupActiveRentals() {
  try {
    console.log('🔄 [cleanupActiveRentals] 시작...');

    // 1. uid:xxx 형식의 phone_number를 가진 active_rentals 조회
    const result = await pool.query(`
      SELECT id, cafe_id, phone_number, quantity, rental_date, expected_return_date
      FROM active_rentals
      WHERE phone_number LIKE 'uid:%'
      ORDER BY rental_date DESC
    `);

    console.log(`📊 [cleanupActiveRentals] 정리 대상: ${result.rows.length}개`);

    if (result.rows.length === 0) {
      console.log('✅ [cleanupActiveRentals] 정리할 데이터가 없습니다.');
      return;
    }

    let updatedCount = 0;
    let deletedCount = 0;

    for (const row of result.rows) {
      const uidString = row.phone_number; // 'uid:xxxxx' 형식
      const uid = uidString.replace('uid:', '');

      console.log(`\n🔍 [cleanupActiveRentals] 처리 중: ${uidString}`);

      try {
        // Firebase에서 사용자 정보 조회
        const userDoc = await db.collection('users').doc(uid).get();

        if (!userDoc.exists) {
          console.warn(`⚠️ [cleanupActiveRentals] 사용자를 찾을 수 없음: ${uid} - 삭제합니다.`);

          // 사용자가 없으면 해당 active_rental 삭제
          await pool.query(
            'DELETE FROM active_rentals WHERE id = $1',
            [row.id]
          );
          deletedCount++;
          continue;
        }

        const userData = userDoc.data();
        const userPhone = userData.mobile;
        const maskedPhone = maskPhoneNumber(userPhone);

        if (!maskedPhone) {
          console.warn(`⚠️ [cleanupActiveRentals] 유효하지 않은 전화번호: ${userPhone} - 삭제합니다.`);

          // 유효하지 않은 전화번호면 삭제
          await pool.query(
            'DELETE FROM active_rentals WHERE id = $1',
            [row.id]
          );
          deletedCount++;
          continue;
        }

        console.log(`  🔄 [cleanupActiveRentals] 업데이트: ${uidString} -> ${maskedPhone}`);

        // 같은 전화번호로 이미 대여가 있는지 확인
        const existingRental = await pool.query(
          'SELECT id, quantity FROM active_rentals WHERE cafe_id = $1 AND phone_number = $2 AND id != $3',
          [row.cafe_id, maskedPhone, row.id]
        );

        if (existingRental.rows.length > 0) {
          // 이미 같은 전화번호로 대여가 있으면 수량 합산 후 현재 레코드 삭제
          const existingId = existingRental.rows[0].id;
          const existingQty = existingRental.rows[0].quantity;
          const totalQty = existingQty + row.quantity;

          console.log(`  📦 [cleanupActiveRentals] 기존 대여와 합산: ${existingQty} + ${row.quantity} = ${totalQty}`);

          await pool.query(
            'UPDATE active_rentals SET quantity = $1 WHERE id = $2',
            [totalQty, existingId]
          );

          await pool.query(
            'DELETE FROM active_rentals WHERE id = $1',
            [row.id]
          );

          updatedCount++;
        } else {
          // 중복이 없으면 phone_number만 업데이트
          await pool.query(
            'UPDATE active_rentals SET phone_number = $1 WHERE id = $2',
            [maskedPhone, row.id]
          );

          updatedCount++;
        }

        console.log(`  ✅ [cleanupActiveRentals] 완료`);

      } catch (error) {
        console.error(`  ❌ [cleanupActiveRentals] 처리 실패: ${uidString}`, error);
      }
    }

    console.log(`\n✅ [cleanupActiveRentals] 정리 완료!`);
    console.log(`  - 업데이트: ${updatedCount}개`);
    console.log(`  - 삭제: ${deletedCount}개`);

  } catch (error) {
    console.error('❌ [cleanupActiveRentals] 오류:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// 스크립트 실행
cleanupActiveRentals()
  .then(() => {
    console.log('🎉 스크립트 완료!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 스크립트 실패:', error);
    process.exit(1);
  });
