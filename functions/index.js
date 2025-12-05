const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const crypto = require('crypto');

admin.initializeApp();
const db = admin.firestore();

/**
 * 네이버 SENS SMS 발송 함수
 * 환경변수 필요:
 * - NAVER_SENS_SERVICE_ID: SENS 서비스 ID
 * - NAVER_SENS_ACCESS_KEY: 네이버 클라우드 Access Key
 * - NAVER_SENS_SECRET_KEY: 네이버 클라우드 Secret Key
 * - NAVER_SENS_CALLING_NUMBER: 발신번호
 */
async function sendNaverSMS(phoneNumber, message) {
  const serviceId = process.env.NAVER_SENS_SERVICE_ID;
  const accessKey = process.env.NAVER_SENS_ACCESS_KEY;
  const secretKey = process.env.NAVER_SENS_SECRET_KEY;
  const callingNumber = process.env.NAVER_SENS_CALLING_NUMBER;

  if (!serviceId || !accessKey || !secretKey || !callingNumber) {
    console.error('⚠️  네이버 SENS 환경변수가 설정되지 않았습니다.');
    return { success: false, error: '네이버 SENS 환경변수 미설정' };
  }

  try {
    const timestamp = Date.now().toString();
    const url = `/sms/v2/services/${serviceId}/messages`;

    // HMAC SHA256 서명 생성
    const hmac = crypto.createHmac('sha256', secretKey);
    hmac.update('POST');
    hmac.update(' ');
    hmac.update(url);
    hmac.update('\n');
    hmac.update(timestamp);
    hmac.update('\n');
    hmac.update(accessKey);
    const signature = hmac.digest('base64');

    // SMS 발송 요청
    const response = await axios.post(
      `https://sens.apigw.ntruss.com${url}`,
      {
        type: 'SMS',
        contentType: 'COMM',
        countryCode: '82',
        from: callingNumber,
        content: message,
        messages: [
          {
            to: phoneNumber
          }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'x-ncp-apigw-timestamp': timestamp,
          'x-ncp-iam-access-key': accessKey,
          'x-ncp-apigw-signature-v2': signature
        }
      }
    );

    if (response.data.statusCode === '202') {
      console.log(`✅ SMS 발송 성공: ${phoneNumber}`);
      return { success: true };
    } else {
      console.error(`❌ SMS 발송 실패: ${response.data.statusName}`);
      return { success: false, error: response.data.statusName };
    }
  } catch (error) {
    console.error('❌ SMS 발송 중 오류:', error.message);
    if (error.response) {
      console.error('응답 데이터:', error.response.data);
    }
    return { success: false, error: error.message };
  }
}

/**
 * 반납일자 SMS 알림 스케줄러
 * 매일 정오 12시(한국 시간)에 실행
 * Firebase Cloud Scheduler에서 호출
 */
exports.sendRentalNotifications = functions
  .region('asia-northeast3')
  .pubsub.schedule('0 12 * * *')
  .timeZone('Asia/Seoul')
  .onRun(async (context) => {
    console.log('🔔 SMS 알림 스케줄러 시작:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

    try {
      // 1. Firebase에서 알림 설정 가져오기
      const constantsDoc = await db.collection('constants').doc('bottle_club').get();

      if (!constantsDoc.exists) {
        console.error('❌ constants.bottle_club 문서를 찾을 수 없습니다.');
        return null;
      }

      const { notifications } = constantsDoc.data();

      if (!notifications || !Array.isArray(notifications)) {
        console.error('❌ notifications 배열이 존재하지 않습니다.');
        return null;
      }

      console.log(`📋 알림 설정: ${notifications.length}개 알림 시점`);

      // 2. 대여 중인 컵 조회
      const rentsSnapshot = await db.collection('rents')
        .where('status', '==', 'rent')
        .get();

      if (rentsSnapshot.empty) {
        console.log('ℹ️  대여 중인 컵이 없습니다.');
        return null;
      }

      console.log(`🔍 대여 중인 컵: ${rentsSnapshot.size}개`);

      let sentCount = 0;
      let webRentCount = 0;

      // 3. 각 대여건에 대해 알림 확인 및 발송
      for (const rentDoc of rentsSnapshot.docs) {
        const rentData = rentDoc.data();
        const { uid, rented_date, source } = rentData;

        // 웹에서 빌린 것만 SMS 발송 (앱 대여는 푸시 알림 사용)
        if (source !== 'web') {
          continue;
        }

        webRentCount++;

        // 대여일로부터 경과일 계산
        const rentedDate = rented_date.toDate();
        const now = new Date();
        const diffTime = now.getTime() - rentedDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

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
          const message = notification.body;

          console.log(`📨 SMS 발송 준비: ${phoneNumber} (${diffDays}일차)`);
          console.log(`   제목: ${notification.title}`);
          console.log(`   내용: ${message.substring(0, 30)}...`);

          // 6. SMS 발송
          const result = await sendNaverSMS(phoneNumber, message);

          if (result.success) {
            sentCount++;
          }
        }
      }

      console.log(`✅ SMS 알림 완료: 웹 대여 ${webRentCount}건 중 ${sentCount}건 발송`);
      return null;

    } catch (error) {
      console.error('❌ SMS 알림 스케줄러 오류:', error);
      return null;
    }
  });

/**
 * 수동 테스트용 HTTP 함수
 * 개발 환경에서 테스트할 때 사용
 * https://[region]-[project-id].cloudfunctions.net/testSmsNotification
 */
exports.testSmsNotification = functions
  .region('asia-northeast3')
  .https.onRequest(async (req, res) => {
    console.log('🧪 수동 테스트 실행');

    try {
      // 실제 스케줄러 함수와 동일한 로직 실행
      await exports.sendRentalNotifications.run({});
      res.status(200).send('SMS 알림 테스트 완료');
    } catch (error) {
      console.error('테스트 중 오류:', error);
      res.status(500).send('테스트 실패: ' + error.message);
    }
  });
