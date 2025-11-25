const cron = require('node-cron');
const moment = require('moment-timezone');
const { db } = require('../config/firebase');

/**
 * SMS 발송 함수 (Aligo SMS API 사용)
 * 환경변수 필요:
 * - SMS_API_KEY: Aligo API Key
 * - SMS_USER_ID: Aligo User ID
 * - SMS_SENDER: 발신번호
 */
async function sendSMS(phoneNumber, message) {
  const SMS_API_KEY = process.env.SMS_API_KEY;
  const SMS_USER_ID = process.env.SMS_USER_ID;
  const SMS_SENDER = process.env.SMS_SENDER;

  if (!SMS_API_KEY || !SMS_USER_ID || !SMS_SENDER) {
    console.error('⚠️  SMS 환경변수가 설정되지 않았습니다.');
    return { success: false, error: 'SMS 환경변수 미설정' };
  }

  try {
    // Aligo SMS API 호출
    const FormData = require('form-data');
    const form = new FormData();
    form.append('key', SMS_API_KEY);
    form.append('userid', SMS_USER_ID);
    form.append('sender', SMS_SENDER);
    form.append('receiver', phoneNumber);
    form.append('msg', message);
    form.append('msg_type', 'SMS');

    const response = await fetch('https://apis.aligo.in/send/', {
      method: 'POST',
      body: form
    });

    const result = await response.json();

    if (result.result_code === '1') {
      console.log(`✅ SMS 발송 성공: ${phoneNumber}`);
      return { success: true };
    } else {
      console.error(`❌ SMS 발송 실패: ${result.message}`);
      return { success: false, error: result.message };
    }
  } catch (error) {
    console.error('❌ SMS 발송 중 오류:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 반납일자 SMS 알림 스케줄러
 * 매일 정오 12시(한국 시간)에 실행
 */
function startSMSNotificationScheduler() {
  // 매일 12:00 (한국 시간)에 실행
  cron.schedule('0 12 * * *', async () => {
    console.log('🔔 SMS 알림 스케줄러 시작:', moment().tz('Asia/Seoul').format('YYYY-MM-DD HH:mm:ss'));

    try {
      // 1. Firebase에서 알림 설정 가져오기
      const constantsDoc = await db.collection('constants').doc('bottle_club').get();

      if (!constantsDoc.exists) {
        console.error('❌ constants.bottle_club 문서를 찾을 수 없습니다.');
        return;
      }

      const { notifications } = constantsDoc.data();

      if (!notifications || !Array.isArray(notifications)) {
        console.error('❌ notifications 배열이 존재하지 않습니다.');
        return;
      }

      console.log(`📋 알림 설정: ${notifications.length}개 알림 시점`);

      // 2. 대여 중인 컵 조회
      const rentsSnapshot = await db.collection('rents')
        .where('status', '==', 'rent')
        .get();

      if (rentsSnapshot.empty) {
        console.log('ℹ️  대여 중인 컵이 없습니다.');
        return;
      }

      console.log(`🔍 대여 중인 컵: ${rentsSnapshot.size}개`);

      let sentCount = 0;

      // 3. 각 대여건에 대해 알림 확인 및 발송
      for (const rentDoc of rentsSnapshot.docs) {
        const rentData = rentDoc.data();
        const { uid, rented_date, source } = rentData;

        // 웹에서 빌린 것만 SMS 발송 (앱 대여는 푸시 알림 사용)
        if (source !== 'web') {
          console.log(`⏭️  건너뜀: 앱 대여 (푸시 알림 사용) - ${uid}`);
          continue;
        }

        // 대여일로부터 경과일 계산
        const rentedMoment = moment(rented_date.toDate());
        const nowMoment = moment();
        const diffDays = Math.floor(moment.duration(nowMoment.diff(rentedMoment)).asDays()) + 1;

        // 해당 경과일에 맞는 알림 찾기
        const notification = notifications.find(noti => noti.day === diffDays);

        if (notification) {
          // 4. users 컬렉션에서 전화번호 조회
          const userDoc = await db.collection('users').doc(uid).get();

          if (!userDoc.exists) {
            console.warn(`⚠️  사용자를 찾을 수 없습니다: ${uid}`);
            continue;
          }

          const userData = userDoc.data();
          const phoneNumber = userData.mobile;

          if (!phoneNumber) {
            console.warn(`⚠️  전화번호가 없습니다: ${uid}`);
            continue;
          }

          // 5. SMS 메시지 생성
          const message = notification.body.replace(/\\n/g, '\n');

          console.log(`📨 SMS 발송 준비: ${phoneNumber} (${diffDays}일차)`);
          console.log(`   제목: ${notification.title}`);
          console.log(`   내용: ${message.substring(0, 30)}...`);

          // 6. SMS 발송
          const result = await sendSMS(phoneNumber, message);

          if (result.success) {
            sentCount++;
          }
        }
      }

      console.log(`✅ SMS 알림 완료: ${sentCount}건 발송`);

    } catch (error) {
      console.error('❌ SMS 알림 스케줄러 오류:', error);
    }
  }, {
    timezone: 'Asia/Seoul'
  });

  console.log('🚀 SMS 알림 스케줄러가 시작되었습니다. (매일 12:00 KST)');
}

module.exports = { startSMSNotificationScheduler };
