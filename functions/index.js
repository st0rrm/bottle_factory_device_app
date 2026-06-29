const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');

admin.initializeApp();
const db = admin.firestore();

// ============================================================
// [비활성화] 네이버 SENS SMS 발송 함수
// BizM 알림톡으로 대체됨. 코드는 참조용으로 보존.
// 환경변수: NAVER_SENS_SERVICE_ID, NAVER_SENS_ACCESS_KEY,
//           NAVER_SENS_SECRET_KEY, NAVER_SENS_CALLING_NUMBER
// ============================================================
// async function sendNaverSMS(phoneNumber, message) {
//   const serviceId = process.env.NAVER_SENS_SERVICE_ID;
//   const accessKey = process.env.NAVER_SENS_ACCESS_KEY;
//   const secretKey = process.env.NAVER_SENS_SECRET_KEY;
//   const callingNumber = process.env.NAVER_SENS_CALLING_NUMBER;
//
//   if (!serviceId || !accessKey || !secretKey || !callingNumber) {
//     console.error('⚠️  네이버 SENS 환경변수가 설정되지 않았습니다.');
//     return { success: false, error: '네이버 SENS 환경변수 미설정' };
//   }
//
//   try {
//     const timestamp = Date.now().toString();
//     const url = `/sms/v2/services/${serviceId}/messages`;
//     const hmac = crypto.createHmac('sha256', secretKey);
//     hmac.update('POST');
//     hmac.update(' ');
//     hmac.update(url);
//     hmac.update('\n');
//     hmac.update(timestamp);
//     hmac.update('\n');
//     hmac.update(accessKey);
//     const signature = hmac.digest('base64');
//
//     const response = await axios.post(
//       `https://sens.apigw.ntruss.com${url}`,
//       {
//         type: 'SMS',
//         contentType: 'COMM',
//         countryCode: '82',
//         from: callingNumber,
//         content: message,
//         messages: [{ to: phoneNumber }]
//       },
//       {
//         headers: {
//           'Content-Type': 'application/json; charset=utf-8',
//           'x-ncp-apigw-timestamp': timestamp,
//           'x-ncp-iam-access-key': accessKey,
//           'x-ncp-apigw-signature-v2': signature
//         }
//       }
//     );
//
//     if (response.data.statusCode === '202') {
//       console.log(`✅ SMS 발송 성공: ${phoneNumber}`);
//       return { success: true };
//     } else {
//       console.error(`❌ SMS 발송 실패: ${response.data.statusName}`);
//       return { success: false, error: response.data.statusName };
//     }
//   } catch (error) {
//     console.error('❌ SMS 발송 중 오류:', error.message);
//     if (error.response) console.error('응답 데이터:', error.response.data);
//     return { success: false, error: error.message };
//   }
// }

// ============================================================
// 헬퍼: 변수 치환 / KST 날짜 포맷
// ============================================================

/**
 * 템플릿 문자열의 #{key} 토큰을 vars[key] 값으로 치환.
 *   substituteVariables('대여일: #{대여일}', { 대여일: '2026-06-28' })
 *   → '대여일: 2026-06-28'
 */
function substituteVariables(template, vars) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.split(`#{${key}}`).join(value),
    template
  );
}

/**
 * Date → YYYY-MM-DD (KST).
 * Cloud Functions 런타임은 UTC이므로 +9시간 후 UTC getter로 추출.
 */
function formatKSTDate(date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}`;
}

/**
 * Date → YYYYMMDDHHmmss (KST, 14자리). BizM reserveDt용.
 */
function formatKSTReserveDt(date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return (
    kst.getUTCFullYear() +
    pad(kst.getUTCMonth() + 1) +
    pad(kst.getUTCDate()) +
    pad(kst.getUTCHours()) +
    pad(kst.getUTCMinutes()) +
    pad(kst.getUTCSeconds())
  );
}

/**
 * rents 문서 데이터 → 메시지 본문용 변수 객체.
 * 반납일 = 대여일 + 14일.
 */
function buildRentVariables(rentedDate) {
  const dueDate = new Date(rentedDate.getTime() + 14 * 24 * 60 * 60 * 1000);
  return {
    대여일: formatKSTDate(rentedDate),
    반납일: formatKSTDate(dueDate),
  };
}

/**
 * BizM 응답 코드 → 진단 힌트 매핑.
 * 알려진 코드만 힌트 반환. 모르는 코드는 null.
 */
function interpretBizMCode(code) {
  const HINTS = {
    K100: "message_type 필드 오류 — 'AT'(대문자) 확인",
    K101: 'profile (발신프로필 키) 형식 오류',
    K107: 'userid 헤더 값 오류 — BIZM_USER_ID 시크릿 확인',
    K108: '전화번호(phn) 형식 오류 — E.164 형식(82~) 확인',
    K200: '발신프로필 키 인증 실패 — BIZM_PROFILE_KEY 시크릿 확인',
    K201: '발신프로필 키 형식 오류 (40자 hash 확인)',
    K202: '템플릿 코드(tmplId) 미등록/미승인 — BizM 포털에서 템플릿 심사 상태 확인',
    E101: 'userid 누락 — 헤더 설정 확인',
    E102: '발신프로필 키(profile) 누락 — BIZM_PROFILE_KEY 환경변수 미설정 또는 빈 문자열',
    E103: '메시지 본문(msg) 누락',
    E104: '템플릿 코드(tmplId) 누락 — biztalk 항목 tmplId 필드 확인',
    E105: '전화번호(phn) 누락 또는 형식 오류',
  };
  return HINTS[code] || null;
}

/**
 * biztalk 배열 항목 필드 검증.
 * 누락/오류 발견 시 경고 로그 기록 후 false 반환.
 */
function validateBiztalkEntry(entry, day) {
  const issues = [];
  if (!entry.tmplId) issues.push('tmplId 누락');
  if (!entry.msg) issues.push('msg 누락');
  if (entry.message_type !== 'AT') {
    issues.push(`message_type='${entry.message_type}' (기대값: 'AT')`);
  }
  if (issues.length) {
    console.warn(
      `⚠️  biztalk day=${day} 항목 검증 실패: ${issues.join(', ')}`
    );
    console.warn(
      '   → constants/bottle_club.biztalk 데이터 점검 필요'
    );
    return false;
  }
  return true;
}

/**
 * BizM 알림톡 발송 함수
 *
 * 환경변수:
 *   BIZM_USER_ID      : BizM 계정 ID
 *   BIZM_PROFILE_KEY  : 카카오 채널 sender key (profile hash)
 *   BIZM_SMS_SENDER   : 알림톡 미수신 시 SMS 대체 발신번호 (예: 0212345678)
 *
 * @param {string} phoneNumber - 수신자 전화번호 (010-XXXX-XXXX 또는 01012345678)
 * @param {string} tmplId      - BizM 등록 템플릿 코드
 * @param {string} message     - 발송 메시지 본문 (변수 치환 완료)
 * @param {object} [options]
 * @param {string} [options.reserveDt='00000000000000'] - YYYYMMDDHHmmss (KST). 기본 즉시 발송.
 * @param {Array}  [options.button]                     - BizM 버튼 정의 배열 (선택)
 */
async function sendBizMAlimtalk(phoneNumber, tmplId, message, options = {}) {
  const { reserveDt = '00000000000000', button } = options;
  const userId = process.env.BIZM_USER_ID;
  const profileKey = process.env.BIZM_PROFILE_KEY;
  const smsSender = process.env.BIZM_SMS_SENDER;

  const missingSecrets = [];
  if (!userId) missingSecrets.push('BIZM_USER_ID');
  if (!profileKey) missingSecrets.push('BIZM_PROFILE_KEY');
  if (missingSecrets.length) {
    console.error(`⚠️  BizM 시크릿 미설정: ${missingSecrets.join(', ')}`);
    console.error(
      '   → firebase functions:secrets:set <변수명> 으로 등록 후 재배포'
    );
    console.error(
      '   → 함수에 runWith({ secrets: [...] }) 바인딩 포함 여부도 확인'
    );
    return {
      success: false,
      error: `시크릿 미설정: ${missingSecrets.join(',')}`,
    };
  }

  // 전화번호 형식 검증
  if (typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
    console.error(`⚠️  전화번호 입력 오류: type=${typeof phoneNumber}, value="${phoneNumber}"`);
    return { success: false, error: '전화번호 형식 오류 (문자열 아님 또는 빈 값)' };
  }
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  if (digitsOnly.length < 10 || digitsOnly.length > 13) {
    console.error(`⚠️  전화번호 자릿수 오류 (${digitsOnly.length}자리): "${phoneNumber}"`);
    return { success: false, error: '전화번호 자릿수 오류' };
  }

  // 전화번호 E.164 변환: 010-1234-5678 → 821012345678
  const normalizedPhone = phoneNumber.replace(/-/g, '');
  const e164Phone = normalizedPhone.startsWith('0')
    ? '82' + normalizedPhone.slice(1)
    : normalizedPhone;

  // SMS 대체 발송 여부 (BIZM_SMS_SENDER 설정 시 활성화)
  const smsLength = Buffer.byteLength(message, 'utf8');
  const fallback = smsSender
    ? {
        smsKind: smsLength <= 90 ? 'S' : 'L',
        msgSms: message,
        smsSender,
      }
    : {};

  // // [향후 확장 — 필요 시 주석 해제] LMS 전용 제목 + SMS 단축 본문
  // const SMS_SUBJECT = '[리턴미컵] 반납 안내';
  // const SMS_SHORT_MSG = '리턴미컵 반납 부탁드립니다. 자세한 내용은 카카오톡 확인.';
  // const fallback = smsSender
  //   ? {
  //       smsKind: smsLength <= 90 ? 'S' : 'L',
  //       msgSms: smsLength <= 90 ? SMS_SHORT_MSG : message,
  //       smsSender,
  //       ...(smsLength > 90 && { msgSubject: SMS_SUBJECT }),
  //     }
  //   : {};

  const payload = [
    {
      message_type: 'AT',
      phn: e164Phone,
      profile: profileKey,
      reserveDt,
      tmplId,
      msg: message,
      ...(button && { button }),
      ...fallback,
    },
  ];

  try {
    const response = await axios.post(
      'https://alimtalk-api.bizmsg.kr/v2/sender/send',
      payload,
      {
        headers: {
          'Content-type': 'application/json;charset=UTF-8',
          userid: userId,
        },
        timeout: 100000,
      }
    );

    const result = response.data[0];

    if (result.code === '0000') {
      console.log(`✅ 알림톡 발송 요청 성공: ${phoneNumber} (msgid: ${result.msgid})`);
      return { success: true, msgid: result.msgid };
    } else {
      const hint = interpretBizMCode(result.code);
      console.error(
        `❌ 알림톡 발송 실패: [${result.code}] ${result.message} (tmplId=${tmplId}, phn=${e164Phone})`
      );
      if (hint) {
        console.error(`   → 추정 원인: ${hint}`);
      } else {
        console.error('   → 알려지지 않은 코드. BizM 응답 코드 표 참고 필요.');
      }
      console.error('   → 전체 응답:', JSON.stringify(result));
      return { success: false, error: `${result.code}: ${result.message}` };
    }
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('❌ BizM API 타임아웃 (100초 초과). BizM 서버 응답 지연 의심.');
    } else if (['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'EAI_AGAIN'].includes(error.code)) {
      console.error(`❌ BizM API 연결 실패 [${error.code}]: 네트워크/DNS 또는 BizM 서버 점검 의심`);
    } else if (error.response) {
      console.error(
        `❌ BizM API HTTP ${error.response.status} ${error.response.statusText || ''}`
      );
      console.error('   → 응답 데이터:', JSON.stringify(error.response.data));
      if (error.response.status === 401 || error.response.status === 403) {
        console.error('   → 추정 원인: 인증 실패 (userid 또는 profile key 무효)');
      }
    } else {
      console.error('❌ 알림톡 발송 중 예외:', error.message);
      console.error('   → 스택:', error.stack);
    }
    return { success: false, error: error.message };
  }
}

/**
 * 반납일자 알림톡 스케줄러
 * 매일 정오 12시(한국 시간)에 실행
 * Firebase Cloud Scheduler에서 호출
 *
 * Firestore constants/bottle_club.biztalk 배열 구조:
 *   { day: N, message_type: "AT", msg: "...", tmplId: "remind01"|"remind02"|"reset_01" }
 */
exports.sendRentalNotifications = functions
  .region('asia-northeast3')
  .runWith({ secrets: ['BIZM_USER_ID', 'BIZM_PROFILE_KEY', 'BIZM_SMS_SENDER'] })
  .pubsub.schedule('0 12 * * *')
  .timeZone('Asia/Seoul')
  .onRun(async (context) => {
    console.log('🔔 알림톡 스케줄러 시작:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

    try {
      // 1. Firebase에서 알림 설정 가져오기
      const constantsDoc = await db.collection('constants').doc('bottle_club').get();

      if (!constantsDoc.exists) {
        console.error('❌ constants/bottle_club 문서를 찾을 수 없습니다.');
        console.error('   → Firestore에 해당 문서 생성 후 biztalk 배열 입력 필요');
        return null;
      }

      const { biztalk } = constantsDoc.data();

      if (!biztalk || !Array.isArray(biztalk)) {
        console.error('❌ constants/bottle_club.biztalk 배열이 존재하지 않습니다.');
        console.error('   → BIZM_ALIMTALK.md §2.6 인덱스 매핑 참고하여 4개 원소 입력 필요');
        return null;
      }

      console.log(`📋 알림 설정: ${biztalk.length}개 알림 시점 — day=[${biztalk.map(e => e.day).join(',')}]`);

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

        // 웹에서 빌린 것만 발송 (앱 대여는 푸시 알림 사용)
        if (source !== 'web') {
          continue;
        }

        webRentCount++;

        // 대여일로부터 경과일 계산
        const rentedDate = rented_date.toDate();
        const now = new Date();
        const diffTime = now.getTime() - rentedDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // 해당 경과일에 맞는 biztalk 알림 찾기
        const biztalkEntry = biztalk.find(entry => entry.day === diffDays);

        if (biztalkEntry) {
          // biztalk 항목 필드 검증
          if (!validateBiztalkEntry(biztalkEntry, diffDays)) continue;

          // 4. users 컬렉션에서 전화번호 조회
          const userDoc = await db.collection('users').doc(uid).get();

          if (!userDoc.exists) {
            console.warn(`⚠️  사용자를 찾을 수 없습니다: uid=${uid} (rentId=${rentDoc.id})`);
            continue;
          }

          const userData = userDoc.data();
          const phoneNumber = userData.mobile;

          if (!phoneNumber) {
            console.warn(`⚠️  전화번호 누락: uid=${uid} (users/${uid}.mobile 필드 없음)`);
            continue;
          }

          // 메시지 본문 변수 치환 (#{대여일}, #{반납일})
          const message = substituteVariables(
            biztalkEntry.msg,
            buildRentVariables(rentedDate)
          );

          console.log(`📨 알림톡 발송 준비: ${phoneNumber} (${diffDays}일차)`);
          console.log(`   tmplId: ${biztalkEntry.tmplId}`);
          console.log(`   내용: ${message.substring(0, 30)}...`);

          // 5. 알림톡 발송
          const result = await sendBizMAlimtalk(
            phoneNumber,
            biztalkEntry.tmplId,
            message,
            { button: biztalkEntry.button }
          );

          if (result.success) {
            sentCount++;
          }
        }
      }

      console.log(`✅ 알림톡 발송 완료: 웹 대여 ${webRentCount}건 중 ${sentCount}건 발송`);
      return null;

    } catch (error) {
      console.error('❌ 알림톡 스케줄러 오류:', error);
      return null;
    }
  });

/**
 * 대여 당일 알림톡 발송 트리거
 * rents/{rentId} 문서 생성 시 호출.
 * BizM reserveDt(예약 발송)를 활용해 "발송 요청은 즉시, 실제 발송은 5분 뒤"로 처리.
 *
 * Firestore constants/bottle_club.biztalk[day=0] 항목을 사용 (tmplId: remind00 예정).
 */
exports.sendRentalNotificationOnCreate = functions
  .region('asia-northeast3')
  .runWith({ secrets: ['BIZM_USER_ID', 'BIZM_PROFILE_KEY', 'BIZM_SMS_SENDER'] })
  .firestore.document('rents/{rentId}')
  .onCreate(async (snap, context) => {
    const rentData = snap.data();
    const { uid, rented_date, source } = rentData;

    console.log(`🆕 신규 대여 감지: ${context.params.rentId} (source=${source})`);

    // 웹 대여만 처리 (앱 대여는 푸시 알림)
    if (source !== 'web') {
      console.log('⏭️  앱 대여 → 푸시 알림 사용. 알림톡 건너뜀.');
      return null;
    }

    if (!rented_date) {
      console.warn('⚠️  rented_date 필드가 없습니다.');
      return null;
    }

    try {
      // 1. biztalk[day=0] 항목 조회
      const constantsDoc = await db.collection('constants').doc('bottle_club').get();
      if (!constantsDoc.exists) {
        console.error('❌ constants/bottle_club 문서를 찾을 수 없습니다.');
        console.error('   → Firestore에 해당 문서 생성 후 biztalk 배열 입력 필요');
        return null;
      }

      const biztalk = constantsDoc.data().biztalk;
      if (!biztalk || !Array.isArray(biztalk)) {
        console.error('❌ constants/bottle_club.biztalk 배열이 존재하지 않습니다.');
        console.error('   → BIZM_ALIMTALK.md §2.6 인덱스 매핑 참고하여 4개 원소 입력 필요');
        return null;
      }

      const entry = biztalk.find((e) => e.day === 0);
      if (!entry) {
        console.warn('⚠️  biztalk day=0 항목이 없습니다. 대여 당일 알림 건너뜀.');
        console.warn(
          '   → biztalk 배열에 { day: 0, message_type: "AT", tmplId: "remind00", msg } 추가 필요'
        );
        console.warn(
          `   → 현재 등록된 day 값: [${biztalk.map((e) => e.day).join(',')}]`
        );
        return null;
      }

      if (!validateBiztalkEntry(entry, 0)) return null;

      // 2. 수신자 전화번호 조회
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        console.warn(`⚠️  사용자를 찾을 수 없습니다: uid=${uid}`);
        console.warn(`   → rents/${context.params.rentId} 문서의 uid가 users 컬렉션에 존재하지 않음`);
        return null;
      }

      const phoneNumber = userDoc.data().mobile;
      if (!phoneNumber) {
        console.warn(`⚠️  전화번호 누락: uid=${uid}`);
        console.warn(`   → users/${uid}.mobile 필드 누락. 회원가입 시 전화번호 수집 여부 확인`);
        return null;
      }

      // 3. 메시지 본문 변수 치환
      const rentedDate = rented_date.toDate();
      const message = substituteVariables(entry.msg, buildRentVariables(rentedDate));

      // 4. 5분 후 예약 발송 (BizM reserveDt 활용)
      const reserveAt = new Date(Date.now() + 5 * 60 * 1000);
      const reserveDt = formatKSTReserveDt(reserveAt);

      console.log(`📨 대여 당일 알림톡 예약: ${phoneNumber}`);
      console.log(`   tmplId: ${entry.tmplId}`);
      console.log(`   reserveDt: ${reserveDt} (KST)`);
      console.log(`   내용: ${message.substring(0, 30)}...`);

      const result = await sendBizMAlimtalk(phoneNumber, entry.tmplId, message, {
        reserveDt,
        button: entry.button,
      });

      if (result.success) {
        console.log(`✅ 대여 당일 알림톡 예약 완료: ${context.params.rentId}`);
      }
      return null;
    } catch (error) {
      console.error('❌ 대여 당일 알림톡 트리거 오류:', error);
      return null;
    }
  });

/**
 * 수동 테스트용 HTTP 함수
 * 개발 환경에서 테스트할 때 사용
 * https://[region]-[project-id].cloudfunctions.net/testAlimtalkNotification
 */
exports.testAlimtalkNotification = functions
  .region('asia-northeast3')
  .runWith({ secrets: ['BIZM_USER_ID', 'BIZM_PROFILE_KEY', 'BIZM_SMS_SENDER'] })
  .https.onRequest(async (req, res) => {
    console.log('🧪 수동 테스트 실행');

    try {
      await exports.sendRentalNotifications.run({});
      res.status(200).send('알림톡 알림 테스트 완료');
    } catch (error) {
      console.error('테스트 중 오류:', error);
      res.status(500).send('테스트 실패: ' + error.message);
    }
  });
