const RENTAL_CREATED_MESSAGE = `안녕하세요. 우리 동네 컵 대여 서비스, 보틀클럽입니다.
일회용 컵 줄이기에 함께해 주셔서 고맙습니다.

대여일: #{대여일}
반납일: #{반납일}`;

const D7_MESSAGE = `리턴미컵 반납 기한이 7일 남았습니다.
더 많은 일회용 컵을 줄일 수 있도록 대여하신 카페에 반납 부탁드립니다.

대여일: #{대여일}
반납일: #{반납일}`;

const D13_MESSAGE = `리턴미컵 반납 기한이 1일 남았습니다.

대여일: #{대여일}
반납일: #{반납일}`;

const LOST_MESSAGE = `리턴미컵을 분실하셨나요?
아래 링크에서 분실신고접수를 완료해주시기 바랍니다.

분실신고 링크: #{분실신고링크}`;

const TEMPLATES = {
  0: {
    day: 0,
    envKey: 'BIZM_TEMPLATE_RENTAL_CREATED',
    defaultTmplId: 'remind00',
    message: RENTAL_CREATED_MESSAGE,
  },
  7: {
    day: 7,
    envKey: 'BIZM_TEMPLATE_D7',
    defaultTmplId: 'remind01',
    message: D7_MESSAGE,
  },
  13: {
    day: 13,
    envKey: 'BIZM_TEMPLATE_D13',
    defaultTmplId: 'remind02',
    message: D13_MESSAGE,
  },
  179: {
    day: 179,
    envKey: 'BIZM_TEMPLATE_D179',
    defaultTmplId: 'reset01',
    message: LOST_MESSAGE,
  },
};

const DAILY_REMINDER_DAYS = [7, 13, 179];

function getBizMTemplate(day) {
  const template = TEMPLATES[day];
  if (!template) return null;

  return {
    ...template,
    tmplId: process.env[template.envKey] || template.defaultTmplId,
  };
}

module.exports = {
  DAILY_REMINDER_DAYS,
  getBizMTemplate,
};
