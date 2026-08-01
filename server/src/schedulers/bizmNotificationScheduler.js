const cron = require('node-cron');
const { db, FieldValue } = require('../config/firebase');
const {
  buildRentVariables,
  getElapsedKSTDays,
  getKSTDateKey,
  getMissingBizMConfig,
  sendBizMAlimtalk,
  substituteVariables,
} = require('../services/bizmAlimtalk');
const {
  DAILY_REMINDER_DAYS,
  getBizMTemplate,
} = require('../services/bizmTemplates');

let dailyReminderTask = null;
let dailyReminderRunning = false;

function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getSentMarkerKey(day) {
  return `day_${day}`;
}

function hasSentMarker(rentData, day) {
  return Boolean(rentData.alimtalk_sent?.[getSentMarkerKey(day)]?.sent_at);
}

function getRentalCreatedDelayMs() {
  const configuredDelay = Number.parseInt(process.env.BIZM_RENTAL_CREATED_DELAY_MS || '0', 10);
  if (!Number.isFinite(configuredDelay) || configuredDelay < 0) return 0;

  return Math.min(configuredDelay, 60 * 1000);
}

function getReminderGroupKey(rentData, rentedDate, day) {
  return [
    rentData.uid || '',
    rentData.rented_shop_id || rentData.rented_shop || '',
    getKSTDateKey(rentedDate),
    day,
  ].join('|');
}

async function getUserPhoneNumber(uid, fallbackPhoneNumber) {
  if (fallbackPhoneNumber) return fallbackPhoneNumber;
  if (!uid) return null;

  const userDoc = await db.collection('users').doc(uid).get();
  if (!userDoc.exists) {
    console.warn(`⚠️  사용자를 찾을 수 없습니다: uid=${uid}`);
    return null;
  }

  return userDoc.data().mobile || null;
}

async function updateRentDocs(rentIds, payload) {
  const updates = rentIds.map((rentId) =>
    db.collection('rents').doc(rentId).update(payload)
  );
  const results = await Promise.allSettled(updates);

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`⚠️  알림톡 발송 마커 업데이트 실패: rentId=${rentIds[index]}`, result.reason);
    }
  });
}

async function markNotificationSent(rentIds, day, template, result) {
  await updateRentDocs(rentIds, {
    [`alimtalk_sent.${getSentMarkerKey(day)}`]: {
      day,
      template_id: template.tmplId,
      msgid: result.msgid || null,
      sent_at: FieldValue.serverTimestamp(),
    },
  });
}

async function markNotificationFailed(rentIds, day, template, result) {
  await updateRentDocs(rentIds, {
    [`alimtalk_errors.${getSentMarkerKey(day)}`]: {
      day,
      template_id: template?.tmplId || null,
      error: result.error || 'unknown_error',
      failed_at: FieldValue.serverTimestamp(),
    },
  });
}

async function sendRentNotificationGroup(group) {
  const { day, rentIds, rentData, rentedDate, phoneNumber: fallbackPhoneNumber } = group;
  const template = getBizMTemplate(day);

  if (!template) {
    return { success: false, error: `day=${day} 템플릿 없음` };
  }

  const missingConfig = getMissingBizMConfig();
  if (missingConfig.length) {
    console.warn(
      `⏸️  BizM 알림톡 발송 생략: 필수 환경변수 미설정 (${missingConfig.join(', ')}). Firestore에는 실패 마커를 기록하지 않습니다.`
    );
    console.warn(`   day=${day}, rentIds=${rentIds.join(',')}`);
    return {
      success: false,
      skipped: true,
      reason: 'bizm_not_configured',
      missingConfig,
    };
  }

  const phoneNumber = await getUserPhoneNumber(rentData.uid, fallbackPhoneNumber);
  if (!phoneNumber) {
    const result = { success: false, error: 'missing_mobile' };
    await markNotificationFailed(rentIds, day, template, result);
    return result;
  }

  const message = substituteVariables(template.message, buildRentVariables(rentedDate));

  console.log(`📨 BizM 알림톡 발송 준비: uid=${rentData.uid}, day=${day}, count=${rentIds.length}`);
  console.log(`   tmplId: ${template.tmplId}`);
  console.log(`   rentIds: ${rentIds.join(',')}`);

  const result = await sendBizMAlimtalk(phoneNumber, template.tmplId, message);

  if (result.success) {
    await markNotificationSent(rentIds, day, template, result);
  } else {
    await markNotificationFailed(rentIds, day, template, result);
  }

  return result;
}

async function sendRentalCreatedNotification(payload) {
  const {
    rentIds,
    uid,
    phoneNumber,
    rentedDate = new Date(),
    shopId,
    shopName,
  } = payload;

  if (!Array.isArray(rentIds) || rentIds.length === 0) {
    return { success: false, error: 'rentIds 누락' };
  }

  return sendRentNotificationGroup({
    day: 0,
    rentIds,
    rentedDate,
    phoneNumber,
    rentData: {
      uid,
      source: 'web',
      rented_shop_id: shopId,
      rented_shop: shopName,
    },
  });
}

function queueRentalCreatedNotification(payload) {
  const delayMs = getRentalCreatedDelayMs();

  setTimeout(() => {
    sendRentalCreatedNotification(payload).catch((error) => {
      console.error('❌ 대여 완료 알림톡 발송 작업 실패:', error);
    });
  }, delayMs);

  console.log(`🚀 대여 완료 알림톡 작업 등록: rentIds=${payload.rentIds?.join(',') || '(none)'}, delay=${delayMs}ms`);
}

async function runDailyRentalNotifications() {
  if (dailyReminderRunning) {
    console.log('⏭️  BizM 알림톡 스케줄러가 이미 실행 중입니다.');
    return { success: false, skipped: true, reason: 'already_running' };
  }

  dailyReminderRunning = true;
  console.log('🔔 BizM 정오 알림톡 스케줄러 시작:', new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }));

  try {
    const rentsSnapshot = await db.collection('rents')
      .where('status', '==', 'rent')
      .where('source', '==', 'web')
      .get();

    if (rentsSnapshot.empty) {
      console.log('ℹ️  대여 중인 웹 컵이 없습니다.');
      return { success: true, groupCount: 0, sentCount: 0, rentCount: 0 };
    }

    const groups = new Map();

    for (const rentDoc of rentsSnapshot.docs) {
      const rentData = rentDoc.data();
      const rentedDate = toDate(rentData.rented_date);

      if (!rentedDate) {
        console.warn(`⚠️  rented_date 변환 실패: rentId=${rentDoc.id}`);
        continue;
      }

      const elapsedDays = getElapsedKSTDays(rentedDate);
      if (!DAILY_REMINDER_DAYS.includes(elapsedDays)) {
        continue;
      }

      if (hasSentMarker(rentData, elapsedDays)) {
        continue;
      }

      const groupKey = getReminderGroupKey(rentData, rentedDate, elapsedDays);
      const group = groups.get(groupKey) || {
        day: elapsedDays,
        rentIds: [],
        rentData,
        rentedDate,
      };

      group.rentIds.push(rentDoc.id);
      groups.set(groupKey, group);
    }

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const group of groups.values()) {
      const result = await sendRentNotificationGroup(group);
      if (result.success) {
        sentCount++;
      } else if (result.skipped) {
        skippedCount++;
      } else {
        failedCount++;
      }
    }

    console.log(
      `✅ BizM 정오 알림톡 완료: 웹 대여 ${rentsSnapshot.size}건, 대상 그룹 ${groups.size}건, 성공 ${sentCount}건, 실패 ${failedCount}건, 생략 ${skippedCount}건`
    );

    return {
      success: failedCount === 0,
      rentCount: rentsSnapshot.size,
      groupCount: groups.size,
      sentCount,
      failedCount,
      skippedCount,
    };
  } catch (error) {
    console.error('❌ BizM 정오 알림톡 스케줄러 오류:', error);
    return { success: false, error: error.message };
  } finally {
    dailyReminderRunning = false;
  }
}

function startBizMNotificationScheduler() {
  if (process.env.BIZM_SCHEDULER_ENABLED === 'false') {
    console.log('⏸️  BizM 정오 알림톡 스케줄러 비활성화됨 (BIZM_SCHEDULER_ENABLED=false)');
    return;
  }

  if (dailyReminderTask) {
    console.log('⚠️  BizM 정오 알림톡 스케줄러가 이미 시작되어 있습니다.');
    return;
  }

  dailyReminderTask = cron.schedule(
    '0 12 * * *',
    () => {
      runDailyRentalNotifications().catch((error) => {
        console.error('❌ BizM 정오 알림톡 스케줄러 실행 실패:', error);
      });
    },
    { timezone: 'Asia/Seoul' }
  );

  console.log('🚀 BizM 정오 알림톡 스케줄러가 시작되었습니다. (매일 12:00 KST)');
}

function stopBizMNotificationScheduler() {
  if (!dailyReminderTask) return;

  dailyReminderTask.stop();
  dailyReminderTask = null;
  console.log('🛑 BizM 정오 알림톡 스케줄러가 중지되었습니다.');
}

module.exports = {
  queueRentalCreatedNotification,
  runDailyRentalNotifications,
  sendRentalCreatedNotification,
  startBizMNotificationScheduler,
  stopBizMNotificationScheduler,
};
