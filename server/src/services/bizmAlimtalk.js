const BIZM_SEND_URL = 'https://alimtalk-api.bizmsg.kr/v2/sender/send';
const DEFAULT_RESERVE_DT = '00000000000000';

function substituteVariables(template, vars) {
  if (typeof template !== 'string') return '';

  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.split(`#{${key}}`).join(String(value ?? '')),
    template
  );
}

function formatKSTDate(date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}`;
}

function getKSTDateKey(date) {
  return formatKSTDate(date);
}

function getKSTDayNumber(date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return Math.floor(Date.UTC(
    kst.getUTCFullYear(),
    kst.getUTCMonth(),
    kst.getUTCDate()
  ) / (24 * 60 * 60 * 1000));
}

function getElapsedKSTDays(fromDate, toDate = new Date()) {
  return getKSTDayNumber(toDate) - getKSTDayNumber(fromDate);
}

function buildRentVariables(rentedDate) {
  const dueDate = new Date(rentedDate.getTime() + 14 * 24 * 60 * 60 * 1000);
  return {
    대여일: formatKSTDate(rentedDate),
    반납일: formatKSTDate(dueDate),
    분실신고링크: process.env.BIZM_LOST_REPORT_URL || '',
  };
}

function interpretBizMCode(code) {
  const hints = {
    K100: "message_type 필드 오류 - 'AT'(대문자) 확인",
    K101: 'profile (발신프로필 키) 형식 오류',
    K107: 'userid 헤더 값 오류 - BIZM_USER_ID 환경변수 확인',
    K108: '전화번호(phn) 형식 오류 - 82로 시작하는 번호 형식 확인',
    K200: '발신프로필 키 인증 실패 - BIZM_PROFILE_KEY 환경변수 확인',
    K201: '발신프로필 키 형식 오류 (40자 hash 확인)',
    K202: '템플릿 코드(tmplId) 미등록/미승인 - BizM 포털 템플릿 상태 확인',
    E101: 'userid 누락 - 헤더 설정 확인',
    E102: '발신프로필 키(profile) 누락 - BIZM_PROFILE_KEY 환경변수 확인',
    E103: '메시지 본문(msg) 누락',
    E104: '템플릿 코드(tmplId) 누락 - BizM 템플릿 환경변수/기본값 확인',
    E105: '전화번호(phn) 누락 또는 형식 오류',
  };

  return hints[code] || null;
}

function normalizePhoneForBizM(phoneNumber) {
  if (typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
    return {
      success: false,
      error: '전화번호 형식 오류 (문자열 아님 또는 빈 값)',
    };
  }

  const digitsOnly = phoneNumber.replace(/\D/g, '');
  if (digitsOnly.length < 10 || digitsOnly.length > 13) {
    return {
      success: false,
      error: `전화번호 자릿수 오류 (${digitsOnly.length}자리)`,
    };
  }

  const e164Phone = digitsOnly.startsWith('0')
    ? `82${digitsOnly.slice(1)}`
    : digitsOnly;

  return { success: true, phone: e164Phone };
}

function getTimeoutMs() {
  const timeoutMs = Number.parseInt(process.env.BIZM_TIMEOUT_MS || '100000', 10);
  return Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 100000;
}

function getMissingBizMConfig() {
  const missingConfig = [];
  if (!process.env.BIZM_USER_ID) missingConfig.push('BIZM_USER_ID');
  if (!process.env.BIZM_PROFILE_KEY) missingConfig.push('BIZM_PROFILE_KEY');
  return missingConfig;
}

async function sendBizMAlimtalk(phoneNumber, tmplId, message, options = {}) {
  const { reserveDt = DEFAULT_RESERVE_DT, button } = options;
  const userId = process.env.BIZM_USER_ID;
  const profileKey = process.env.BIZM_PROFILE_KEY;
  const smsSender = process.env.BIZM_SMS_SENDER;

  const missingConfig = getMissingBizMConfig();
  if (missingConfig.length) {
    console.error(`⚠️  BizM 환경변수 미설정: ${missingConfig.join(', ')}`);
    console.error('   -> Render 서비스 환경변수에 등록 후 재배포 필요');
    return {
      success: false,
      skipped: true,
      reason: 'bizm_not_configured',
      missingConfig,
      error: `환경변수 미설정: ${missingConfig.join(',')}`,
    };
  }

  if (!tmplId) {
    console.error('⚠️  BizM 템플릿 코드(tmplId)가 없습니다.');
    return { success: false, error: 'tmplId 누락' };
  }

  if (!message) {
    console.error('⚠️  BizM 메시지 본문(msg)이 없습니다.');
    return { success: false, error: 'msg 누락' };
  }

  const normalized = normalizePhoneForBizM(phoneNumber);
  if (!normalized.success) {
    console.error(`⚠️  전화번호 입력 오류: ${normalized.error}, value="${phoneNumber}"`);
    return { success: false, error: normalized.error };
  }

  const smsLength = Buffer.byteLength(message, 'utf8');
  const fallback = smsSender
    ? {
        smsKind: smsLength <= 90 ? 'S' : 'L',
        msgSms: message,
        smsSender,
      }
    : {};

  const payload = [
    {
      message_type: 'AT',
      phn: normalized.phone,
      profile: profileKey,
      reserveDt,
      tmplId,
      msg: message,
      ...(button && { button }),
      ...fallback,
    },
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    const response = await fetch(BIZM_SEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=UTF-8',
        userid: userId,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = responseText ? JSON.parse(responseText) : null;
    } catch (parseError) {
      console.error('❌ BizM API 응답 JSON 파싱 실패:', responseText);
      return { success: false, error: 'BizM 응답 파싱 실패' };
    }

    if (!response.ok) {
      console.error(`❌ BizM API HTTP ${response.status} ${response.statusText || ''}`);
      console.error('   -> 응답 데이터:', JSON.stringify(responseData));
      if (response.status === 401 || response.status === 403) {
        console.error('   -> 추정 원인: 인증 실패 (userid 또는 profile key 무효)');
      }
      return { success: false, error: `HTTP ${response.status}` };
    }

    const result = Array.isArray(responseData) ? responseData[0] : responseData;
    if (!result || typeof result !== 'object') {
      console.error('❌ BizM API 응답 형식 오류:', JSON.stringify(responseData));
      return { success: false, error: 'BizM 응답 형식 오류' };
    }

    if (result.code === '0000') {
      console.log(`✅ 알림톡 발송 요청 성공: ${phoneNumber} (msgid: ${result.msgid})`);
      return { success: true, msgid: result.msgid };
    }

    const hint = interpretBizMCode(result.code);
    console.error(
      `❌ 알림톡 발송 실패: [${result.code}] ${result.message} (tmplId=${tmplId}, phn=${normalized.phone})`
    );
    if (hint) {
      console.error(`   -> 추정 원인: ${hint}`);
    } else {
      console.error('   -> 알려지지 않은 코드. BizM 응답 코드 표 참고 필요.');
    }
    console.error('   -> 전체 응답:', JSON.stringify(result));
    return { success: false, error: `${result.code}: ${result.message}` };
  } catch (error) {
    const networkCode = error.code || error.cause?.code;
    if (error.name === 'AbortError') {
      console.error(`❌ BizM API 타임아웃 (${getTimeoutMs()}ms 초과).`);
    } else if (['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'EAI_AGAIN'].includes(networkCode)) {
      console.error(`❌ BizM API 연결 실패 [${networkCode}]: 네트워크/DNS 또는 BizM 서버 점검 의심`);
    } else {
      console.error('❌ 알림톡 발송 중 예외:', error.message);
      console.error('   -> 스택:', error.stack);
    }
    return { success: false, error: error.message };
  } finally {
    clearTimeout(timeoutId);
  }
}

module.exports = {
  buildRentVariables,
  getMissingBizMConfig,
  getElapsedKSTDays,
  getKSTDateKey,
  formatKSTDate,
  sendBizMAlimtalk,
  substituteVariables,
};
