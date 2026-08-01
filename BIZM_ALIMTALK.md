# BizM 알림톡 구현 문서 (Render)

- 현재 대상: Render backend (`server/`)
- Firebase Functions 기준 문서 백업: `BIZM_ALIMTALK_firebase.md`
- 최종 수정일: 2026-08-01
- 상태: Render 서버 구현 완료, BizM 운영 환경변수 입력 필요

---

## 1. 구현 방향

현재 서비스 구조는 Vercel frontend / Render backend 이므로, BizM 알림톡은 Firebase Functions가 아니라 Render 서버에서 처리한다.

Firestore에는 새 알림 큐 컬렉션을 만들지 않는다. 기존 `rents` 문서를 조회하고, 발송 결과도 해당 `rents` 문서의 필드에 기록한다.

사용하는 Firestore 데이터:

- `rents`: 대여 상태, 대여일, 대여 매장, 웹 대여 여부, 알림톡 발송 마커
- `users`: 사용자 전화번호(`mobile`) 조회

추가되는 `rents` 필드:

```js
alimtalk_sent: {
  day_0: {
    day: 0,
    template_id: 'remind00',
    msgid: '...',
    sent_at: Timestamp
  },
  day_7: { ... },
  day_13: { ... },
  day_179: { ... }
}

alimtalk_errors: {
  day_7: {
    day: 7,
    template_id: 'remind01',
    error: '...',
    failed_at: Timestamp
  }
}
```

Firestore는 스키마리스이므로 일부 `rents` 문서에만 위 필드가 있어도 된다. 기존 문서에 필드가 없으면 아직 발송되지 않은 것으로 본다.

`BIZM_USER_ID` 또는 `BIZM_PROFILE_KEY`가 없으면 발송 작업은 로그만 남기고 생략한다. 이 경우 BizM API를 호출하지 않고, `alimtalk_errors` 필드도 만들지 않는다.

---

## 2. 전송 시점

| 시점 | day | 실행 방식 | 기본 템플릿 |
|---|---:|---|---|
| 대여 완료 직후 | 0 | `/api/users/rental` 응답 후 Render 서버에서 즉시 큐 등록 | `remind00` |
| 대여 7일 경과 | 7 | 매일 12:00 KST Render cron | `remind01` |
| 대여 13일 경과 | 13 | 매일 12:00 KST Render cron | `remind02` |
| 대여 179일 경과 | 179 | 매일 12:00 KST Render cron | `reset01` |

대여 완료 알림은 기본 즉시 발송이다. `BIZM_RENTAL_CREATED_DELAY_MS`로 0~60000ms 범위의 짧은 지연만 줄 수 있다.

정오 리마인더는 Render 서버 시작 시 `node-cron`으로 등록된다.

```js
cron.schedule('0 12 * * *', runDailyRentalNotifications, {
  timezone: 'Asia/Seoul'
});
```

---

## 3. 대상 선정

정오 스케줄러는 다음 조건의 대여 문서를 조회한다.

```js
db.collection('rents')
  .where('status', '==', 'rent')
  .where('source', '==', 'web')
  .get()
```

그 후 코드에서 KST 기준 경과일을 계산하고, `7`, `13`, `179`일차만 발송 대상으로 삼는다.

같은 사용자가 같은 매장에서 같은 대여일에 여러 컵을 빌린 경우, 같은 알림일에는 한 번만 보낸다. 발송 성공/실패 마커는 해당 그룹의 모든 `rents` 문서에 기록한다.

---

## 4. 재발송 및 관리

성공 시:

```js
rents/{rentId}.alimtalk_sent.day_7 = {
  day: 7,
  template_id: 'remind01',
  msgid: '...',
  sent_at: serverTimestamp()
}
```

실패 시:

```js
rents/{rentId}.alimtalk_errors.day_7 = {
  day: 7,
  template_id: 'remind01',
  error: '...',
  failed_at: serverTimestamp()
}
```

단, BizM 필수 환경변수가 누락된 경우는 실패 마커를 기록하지 않는다. 이 단계는 아직 운영 설정이 완료되지 않은 상태로 보고 Render 로그만 남긴다.

재발송 판단:

- `alimtalk_sent.day_* .sent_at`이 있으면 해당 일차 메시지는 다시 보내지 않는다.
- 실패 기록만 있고 성공 마커가 없으면, 같은 경과일에 스케줄러가 다시 실행될 때 재시도될 수 있다.
- 다음날이 되어 경과일이 달라지면 자동 재시도 대상에서는 벗어난다.

수동 재발송이 필요하면 해당 `rents` 문서의 `alimtalk_sent.day_*` 마커를 제거한 뒤, 같은 day 조건에서 스케줄러 또는 별도 재발송 함수를 실행하는 방식으로 관리한다. 현재 별도 관리자 재발송 API는 없다.

---

## 5. 메시지 템플릿

템플릿은 Firestore `constants` 문서에서 읽지 않고 Render 코드에 둔다. 템플릿 ID는 환경변수로 덮어쓸 수 있다.

### day=0 / `remind00`

```text
안녕하세요. 우리 동네 컵 대여 서비스, 보틀클럽입니다.
일회용 컵 줄이기에 함께해 주셔서 고맙습니다.

대여일: #{대여일}
반납일: #{반납일}
```

### day=7 / `remind01`

```text
리턴미컵 반납 기한이 7일 남았습니다.
더 많은 일회용 컵을 줄일 수 있도록 대여하신 카페에 반납 부탁드립니다.

대여일: #{대여일}
반납일: #{반납일}
```

### day=13 / `remind02`

```text
리턴미컵 반납 기한이 1일 남았습니다.

대여일: #{대여일}
반납일: #{반납일}
```

### day=179 / `reset01`

분실 신고 URL은 아직 확정되지 않았으므로 메시지 형식만 유지한다. 실제 URL은 추후 `BIZM_LOST_REPORT_URL`에 입력한다.

```text
리턴미컵을 분실하셨나요?
아래 링크에서 분실신고접수를 완료해주시기 바랍니다.

분실신고 링크: #{분실신고링크}
```

변수 치환:

- `#{대여일}`: KST 기준 대여일, `YYYY-MM-DD`
- `#{반납일}`: KST 기준 대여일 + 14일, `YYYY-MM-DD`
- `#{분실신고링크}`: `BIZM_LOST_REPORT_URL`, 미설정 시 빈 문자열

BizM 포털에 등록/승인된 템플릿 본문은 위 코드 본문과 일치해야 한다.

---

## 6. 환경변수

필수:

```env
BIZM_USER_ID=
BIZM_PROFILE_KEY=
```

선택:

```env
BIZM_SMS_SENDER=
BIZM_TEMPLATE_RENTAL_CREATED=remind00
BIZM_TEMPLATE_D7=remind01
BIZM_TEMPLATE_D13=remind02
BIZM_TEMPLATE_D179=reset01
BIZM_LOST_REPORT_URL=
BIZM_SCHEDULER_ENABLED=true
BIZM_RENTAL_CREATED_DELAY_MS=0
BIZM_TIMEOUT_MS=100000
```

`BIZM_SMS_SENDER`가 있으면 BizM payload에 SMS 대체발송 필드를 포함한다. 없으면 알림톡만 요청한다.

---

## 7. 코드 위치

| 파일 | 역할 |
|---|---|
| `server/src/services/bizmAlimtalk.js` | BizM API 호출, 전화번호 변환, 변수 치환 |
| `server/src/services/bizmTemplates.js` | day별 템플릿 본문과 템플릿 ID |
| `server/src/schedulers/bizmNotificationScheduler.js` | 대여 직후 알림 큐, 매일 12시 리마인더 |
| `server/src/routes/users.js` | 웹 대여 완료 후 day=0 알림 등록 |
| `server/server.js` | Render 서버 시작 시 BizM cron 시작 |
| `render.yaml` | Render 환경변수 정의 |

---

## 8. 운영 체크리스트

- BizM 포털에서 `remind00`, `remind01`, `remind02`, `reset01` 템플릿 승인
- Render 환경변수 `BIZM_USER_ID`, `BIZM_PROFILE_KEY` 등록
- 필요 시 `BIZM_SMS_SENDER` 등록
- 분실 신고 URL 확정 후 `BIZM_LOST_REPORT_URL` 등록
- 배포 후 Render 로그에서 `BizM 정오 알림톡 스케줄러가 시작되었습니다` 확인
- 실제 발송 후 `rents.alimtalk_sent.day_*` 마커 기록 확인
