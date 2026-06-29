# BizM 알림톡 기능 명세서

> **대상**: `functions/index.js` (Firebase Cloud Functions)
> **작성일**: 2026-06-24
> **최종 수정**: 2026-06-28 (코드 작업 완료 반영)
> **상태**: 코드 작업 완료 / 운영 배포 사전 작업 진행 중 (§3.3)

리턴미컵 디바이스(웹)에서 컵을 빌린 사용자에게 반납 안내 알림톡을
카카오톡으로 자동 발송하는 기능에 대한 문서다. 모바일 앱 대여건은
푸시 알림으로 처리하므로 본 기능의 대상이 아니다.

---

## 1. 운영 정책 (확정 — 2026-06-28)

### 1.1 발송 시점

| # | 시점 | day | 트리거 | tmplId |
|---|---|---|---|---|
| 1 | 대여 후 **5분** | 0 | `rents` onCreate Firestore 트리거 + BizM `reserveDt` 5분 후 예약 | `remind00` |
| 2 | 대여 7일 경과 (D-7) | 7 | 매일 **12:00 KST** 스케줄러 | `remind01` |
| 3 | 대여 13일 경과 (D-1) | 13 | 매일 **12:00 KST** 스케줄러 | `remind02` |
| 4 | 대여 179일 경과 (분실 처리) | 179 | 매일 **12:00 KST** 스케줄러 | `reset01` |

### 1.2 메시지 본문 (세부 문장은 추후 변경 가능)

> 변경 시 BizM 템플릿 재심사 필요 (3~7일 소요).

**대여 후 5분** — `remind00`
```
안녕하세요. 우리 동네 컵 대여 서비스, 보틀클럽입니다.
일회용 컵 줄이기에 함께해 주셔서 고맙습니다.

대여일: #{대여일}
반납일: #{반납일}
```

**대여 7일 후 — D-7** — `remind01`
```
리턴미컵 반납 기한이 7일 남았습니다.
더 많은 일회용 컵을 줄일 수 있도록 대여하신 카페에 반납 부탁드립니다.

반납일: #{반납일}
```

**대여 13일 후 — D-1** — `remind02`
```
리턴미컵 반납 기한이 1일 남았습니다.

반납일: #{반납일}
```

**대여 179일 후 — 분실 처리** — `reset01`
```
리턴미컵을 분실하셨나요? 아래의 링크에서 분실신고접수를 완료해주시기 바랍니다.
```

### 1.3 변수 치환

| 변수 | 형식 | 산출 방식 |
|---|---|---|
| `#{대여일}` | `YYYY-MM-DD` | `rents/{rentId}.rented_date`를 KST로 변환 |
| `#{반납일}` | `YYYY-MM-DD` | 대여일 + 14일 |

⚠️ BizM 템플릿 등록 시 동일 식별자(`#{대여일}`, `#{반납일}`)로 신고해야 한다.
한국어 변수명 vs 영문 변수명 정책은 §5 미정 결정 사항 참고.

### 1.4 버튼 (향후 추가 검토)

- D-179 분실 신고 메시지에 "분실 신고하기" 웹링크 버튼 부착이 향후 검토 예정
- 코드는 `button` 필드를 옵션으로 받아 그대로 BizM payload에 전달하도록 사전 준비 (§4.6)
- 추가 시 BizM 템플릿 재심사 필요

### 1.5 날짜 경계 이슈 (우선순위 매우 낮음)

11:59 → 12:00 사이에 걸친 대여 건은 `Math.floor` 기반 `day` 계산에서 1만큼 어긋날 수 있음.
서비스 특성상 컵 대여는 카페 영업시간 중에 발생해 자정 인접 대여가 사실상 없으므로
현행 로직 유지. 대여 당일 메시지는 onCreate 기반이라 영향 없음.

---

## 2. 기능 구조

### 2.1 전체 흐름

```
[Firestore onCreate]            [Cloud Scheduler]            [BizM]            [Kakao]
       │                               │                        │                 │
       │  rents/{rentId} 생성           │  매일 12:00 KST          │                 │
       ▼                               ▼                        │                 │
[sendRentalNotificationOnCreate]  [sendRentalNotifications]     │                 │
       │                               │                        │                 │
       │ biztalk[day=0]                │ biztalk[day=7,13,179]  │                 │
       │ + reserveDt(+5min)            │ + reserveDt(즉시)      │                 │
       │                               │                        │                 │
       └──────────────┬────────────────┘                        │                 │
                      ▼                                         │                 │
              [sendBizMAlimtalk] ─────POST───────────────────► [BizM API]         │
                                                                │                 │
                                                                ├──알림톡 발송 요청──►│
                                                                │                 │
                                                                │◄──결과 코드 반환──┤
                                                                │                 │
                                                                │         [수신 불가 시]
                                                                │                 ▼
                                                                └───SMS 대체 발송──►[SMS]
```

### 2.2 구성 요소

| 구성 요소 | 위치 | 역할 |
|---|---|---|
| `sendBizMAlimtalk()` | `functions/index.js` L89-154 | BizM API 호출 단위 함수 (reserveDt/button 옵션 지원 예정) |
| `sendRentalNotifications` | `functions/index.js` L164-266 | 매일 12:00 KST 트리거 스케줄러 (D-7/D-13/D-179) |
| `sendRentalNotificationOnCreate` | **신규 작성 예정** | `rents` onCreate Firestore 트리거 함수 (대여 5분 후) |
| `testAlimtalkNotification` | `functions/index.js` L273-285 | HTTP 트리거 수동 테스트 함수 |
| `constants/bottle_club.biztalk` | Firestore | 알림 시점별 템플릿/메시지 정의 (day=0,7,13,179) |
| `rents` 컬렉션 | Firestore | 대여 상태 추적 (status, source, rented_date) |
| `users/{uid}.mobile` | Firestore | 수신자 전화번호 |

### 2.3 인증 모델

BizM은 별도의 "API Key"가 없다. 다음 두 가지 자격증명으로 인증한다.

| 자격증명 | 위치 | 환경변수 | 비고 |
|---|---|---|---|
| `userid` | HTTP 헤더 | `BIZM_USER_ID` | 비즈엠 계정명 |
| `profile` (발신 프로필 키) | Payload 필드 | `BIZM_PROFILE_KEY` | 카카오톡 채널 식별 + 인증 비밀값 (40자 hash) |
| `smsSender` | Payload 필드 (선택) | `BIZM_SMS_SENDER` | 알림톡 미수신 시 SMS 대체 발신번호 |

발신 프로필 키는 BizM 포털 `[서비스관리] → [발신프로필키]`에서 발급한다.
카카오톡 비즈니스 채널 인증과 "고객센터 연락처" 등록이 선행되어야 한다.

### 2.4 API 스펙

| 항목 | 값 |
|---|---|
| 엔드포인트 | `POST https://alimtalk-api.bizmsg.kr/v2/sender/send` |
| Content-Type | `application/json;charset=UTF-8` |
| 인증 헤더 | `userid: {BIZM_USER_ID}` |
| Body | JSON 배열 (벌크 발송 지원, 본 구현은 1건씩) |
| 성공 코드 | `response.data[0].code === '0000'` |
| 주요 실패 코드 | `K200` 프로필 키 무효 / `E102` 프로필 키 누락 / `K107` userid 오류 / `K100` message_type 오류 |

### 2.5 Payload 예시

```json
[
  {
    "message_type": "AT",
    "phn": "821012345678",
    "profile": "89823b83f2182b1e229c2e95e21cf5e6301eed98",
    "tmplId": "remind00",
    "reserveDt": "20260628153000",
    "msg": "안녕하세요. ...\n대여일: 2026-06-28\n반납일: 2026-07-12",
    "smsKind": "L",
    "msgSms": "(알림톡 대체) 안녕하세요. ...",
    "smsSender": "0212345678"
  }
]
```

- `phn`은 E.164 형식 (`82` + 0 제거된 번호)
- `reserveDt`: `00000000000000` = 즉시 발송 / `YYYYMMDDHHmmss` (KST) = 예약 발송
- `smsKind`: 90바이트 이하 `S`(SMS) / 초과 `L`(LMS)
- `smsSender` 미설정 시 `smsKind/msgSms/smsSender` 3개 필드 모두 생략

### 2.6 Firestore 데이터 구조

```
constants/bottle_club
└── biztalk: Array<{
      day: number,           // 대여일로부터 경과일 (0 = 대여 당일/5분 후, 7, 13, 179)
      message_type: "AT",
      tmplId: string,        // BizM 심사 통과 템플릿 코드
      msg: string,           // 발송 본문 (#{변수} 치환 전 원본)
      button?: Array<{...}>  // 선택: BizM 버튼 정의 (향후 부착 가능)
    }>
```

**biztalk 배열 인덱스 매핑 (운영 입력안)**:

| 인덱스 | day | tmplId | 시점 |
|---|---|---|---|
| `[0]` | 0 | `remind00` | 대여 당일 (5분 후) |
| `[1]` | 7 | `remind01` | D-7 |
| `[2]` | 13 | `remind02` | D-1 |
| `[3]` | 179 | `reset01` | 분실 처리 |

> `constants/bottle_club.notifications[0~2]`(day=7,13,179)는 구세대 Aligo SMS용으로
> 더 이상 사용되지 않음. 데이터 자체는 보존하되 본 기능은 `biztalk`만 참조.

---

## 3. 현재 구현 진행 상황

### 3.1 완료된 항목

| 항목 | 위치 | 상태 |
|---|---|---|
| 운영 정책 확정 (시점 4개, 메시지 본문) | §1.1-1.2 | ✅ 2026-06-28 확정 |
| BizM v2 API 호출 코드 | `functions/index.js` L141-220 | ✅ 작성 완료 |
| `sendBizMAlimtalk` 시그니처 확장 (reserveDt/button 옵션) | L141-191 | ✅ 2026-06-28 적용 |
| 헬퍼 4종: `substituteVariables` / `formatKSTDate` / `formatKSTReserveDt` / `buildRentVariables` | L72-124 | ✅ 2026-06-28 추가 |
| 매일 12:00 KST 스케줄러 (`sendRentalNotifications`) | L230-340 | ✅ 작성 완료 (D-7/13/179) |
| 스케줄러에 `runWith` 시크릿 바인딩 + 변수 치환 적용 | L232, L309-313 | ✅ 2026-06-28 적용 |
| **(신규)** `sendRentalNotificationOnCreate` Firestore 트리거 (대여 5분 후) | L349-429 | ✅ 2026-06-28 신설 |
| `testAlimtalkNotification` HTTP 수동 테스트 함수 | L436-449 | ✅ 작성 완료 (runWith 포함) |
| 전화번호 E.164 자동 변환 | L152-156 | ✅ 작성 완료 |
| SMS 대체발송 옵션 (조건부, 환경변수 기반) | L158-166 | ✅ 작성 완료 (활성화 방법 §4.5) |
| SMS LMS 확장용 주석 코드 (msgSubject + 단축 본문) | L168-178 | ✅ 2026-06-28 첨부 (주석 처리 상태) |
| 응답 코드 분기 처리 | L208-214 | ✅ 작성 완료 |
| 웹 대여 필터링 (`source === 'web'`) | L277-279, L360-363 | ✅ 작성 완료 |
| 경과일별 템플릿 매칭 로직 (스케줄러) | L283-330 | ✅ 작성 완료 |
| 기존 Naver SENS SMS 코드 보존 | L14-70 (주석) | ✅ 완료 |
| 미사용 `crypto` import 정리 | L4 (삭제) | ✅ 2026-06-28 적용 |
| `crypto` npm 의존성 정리 | `functions/package.json` | ✅ 2026-06-28 적용 |
| 진단 로그 헬퍼: `interpretBizMCode` (응답 코드 12종 매핑) / `validateBiztalkEntry` (필드 검증) | L126-176 | ✅ 2026-06-28 추가 |
| 단계적 배포용 에러 로그 강화 (시크릿 누락 항목별 / 전화번호 검증 / BizM 코드 힌트 / 네트워크 에러 분류 / 데이터 누락 가이드) | 전 함수 | ✅ 2026-06-28 적용 (§4.11) |

### 3.2 미완 항목 — 코드

✅ **모든 코드 작업 완료 (2026-06-28).** `node --check` 통과 확인.

(§4.1 runWith / §4.2 onCreate 트리거 / §4.3 변수 치환 / §4.6 버튼 옵션 / §4.9 코드 품질 정리 — 모두 적용 완료)

### 3.3 잔여 작업 — 운영 배포 사전 작업

코드 작업은 모두 완료되었으나, **실제 배포·운영을 위해서는 다음 외부/인프라/데이터 작업이 선행되어야 함.**

#### A. 배포 차단 (Hard Blockers — 모두 완료 후 배포 가능)

| # | 항목 | 작업 종류 | 비고 |
|---|---|---|---|
| 1 | BizM 계정 발급 + 본인/사업자 인증 | 외부 계약 | `BIZM_USER_ID` 발급 전제. 정산 카드 등록 필요 |
| 2 | 카카오톡 비즈니스 채널 검수 완료 | 외부 (카카오) | 발신프로필 키 발급 전제. 채널 공식 인증 필요 |
| 3 | BizM 발신프로필 키 발급 | 외부 (BizM 포털) | 카카오 채널 인증 후 `[서비스관리] → [발신프로필키]`. `BIZM_PROFILE_KEY`로 사용 |
| 4 | **Firebase 프로젝트 Blaze 요금제 활성화** | 인프라 (필수) | Cloud Functions 배포에 필수. Spark 요금제로는 배포 불가 |
| 5 | BizM 알림톡 템플릿 4건 등록 → 심사 통과 | 외부 (BizM 포털) | 3~7일 소요. `remind00`/`remind01`/`remind02`/`reset01`. **§1.2 본문과 §1.3 변수 식별자 동일하게 신고** |
| 6 | Firestore `constants/bottle_club.biztalk` 배열 4건 입력 | 데이터 입력 | §2.6 인덱스 매핑 참고. 발급된 `tmplId`로 작성 |
| 7 | Firebase Functions 시크릿 등록 | 인프라 | `firebase functions:secrets:set BIZM_USER_ID` 등 3건 |
| 8 | Cloud Scheduler / Pub/Sub / Eventarc API 활성화 | 인프라 (보통 자동) | `firebase deploy` 시 자동 활성화되나 GCP Console에서 확인 권장 |
| 9 | Firebase Functions 배포 | 인프라 | `cd functions && firebase deploy --only functions` |

#### B. 운영 검증 (배포 직후 수행)

| # | 항목 | 비고 |
|---|---|---|
| 1 | BizM 포털에서 본인 휴대폰을 일회성 수신자로 등록 | 당일 23:59까지 유효. 일회성 인증 모드에서는 등록된 번호로만 발송 가능 |
| 2 | `testAlimtalkNotification` HTTP 호출 → 스케줄러 동작 확인 | `GET https://asia-northeast3-{project-id}.cloudfunctions.net/testAlimtalkNotification` |
| 3 | 실제 `rents` 컬렉션에 테스트 문서 1건 생성 → 5분 후 알림 도착 확인 | `source: 'web'`, `uid`, `rented_date` 포함 |
| 4 | Cloud Functions 로그에서 응답 코드 검증 | `0000` 성공 / `K200/E102/K107/K100` 등 실패 코드별 §6 참고 |
| 5 | 일회성 인증 해제 → 운영 모드 전환 | BizM 포털에서 운영 전환 신청 |

#### C. 운영 권장 (선택, 운영 안정성 강화)

| # | 항목 | 비고 |
|---|---|---|
| 1 | Cloud Functions 오류 알림 설정 | Cloud Monitoring Alert 정책 등록 (이메일/Slack 통보) |
| 2 | BizM 발송 비용 모니터링 | 일일 발송량 + 알림톡/SMS 단가 모니터링. BizM 포털 [발송통계] |
| 3 | 구세대 `notifications` 배열 마킹/제거 | `constants/bottle_club.notifications`는 더 이상 미사용. 혼동 방지를 위해 비활성 표기 또는 제거 검토 |
| 4 | 중복 발송 방지 마커 구현 (§4.8) | 스케줄러 재시도/테스트 함수 임의 호출 대비 |

### 3.4 비활성화된 구세대 코드 (참조용 보존)

| 파일 | 시스템 | 상태 |
|---|---|---|
| `functions/index.js` L14-70 | Naver SENS SMS | 주석 처리 |
| `server/src/schedulers/smsNotificationScheduler.js` | Aligo SMS (서버측) | 파일 존재, `server.js` L5-6에서 import/호출 주석 처리 |

---

## 4. 수정이 필요한 부분

### 4.1 ✅ (적용 완료) `runWith` 시크릿 바인딩

`process.env.BIZM_*` 환경변수가 함수 런타임에 주입되도록 3개 함수 모두에 시크릿 바인딩 적용.

```javascript
.runWith({ secrets: ['BIZM_USER_ID', 'BIZM_PROFILE_KEY', 'BIZM_SMS_SENDER'] })
```

적용 위치:
- `sendRentalNotifications` (L232)
- `sendRentalNotificationOnCreate` (L351)
- `testAlimtalkNotification` (L438)

배포 전 `firebase functions:secrets:set` 명령으로 각 시크릿 값을 등록해야 한다 (§3.3-A.7).

### 4.2 ✅ (적용 완료) 대여 5분 후 발송 — onCreate 트리거 신설

`rents` 컬렉션 문서 생성 시 트리거되어, BizM의 `reserveDt` 필드를 활용해
"발송 요청은 즉시, 실제 발송은 5분 뒤"로 처리한다.

**선택 이유**:
- 함수 내 `setTimeout` → 비권장 (대기시간 과금, 인스턴스 중단 위험)
- Cloud Tasks → 별도 큐 인프라 필요
- **BizM `reserveDt`** → ✅ 별도 인프라 불필요, BizM이 시각까지 보관 후 발송

**코드 골격 (신규)**:
```javascript
exports.sendRentalNotificationOnCreate = functions
  .region('asia-northeast3')
  .runWith({ secrets: ['BIZM_USER_ID', 'BIZM_PROFILE_KEY', 'BIZM_SMS_SENDER'] })
  .firestore.document('rents/{rentId}')
  .onCreate(async (snap, context) => {
    const { uid, rented_date, source } = snap.data();

    if (source !== 'web') return null;  // 앱 대여는 푸시 알림

    const constantsDoc = await db.collection('constants').doc('bottle_club').get();
    const biztalk = constantsDoc.data()?.biztalk || [];
    const entry = biztalk.find(e => e.day === 0);
    if (!entry) {
      console.warn('biztalk day=0 항목이 없습니다.');
      return null;
    }

    const userDoc = await db.collection('users').doc(uid).get();
    const phoneNumber = userDoc.data()?.mobile;
    if (!phoneNumber) return null;

    const rentedDate = rented_date.toDate();
    const dueDate = new Date(rentedDate.getTime() + 14 * 24 * 60 * 60 * 1000);
    const msg = substituteVariables(entry.msg, {
      대여일: formatKSTDate(rentedDate),
      반납일: formatKSTDate(dueDate),
    });

    const reserveDt = formatKSTReserveDt(new Date(Date.now() + 5 * 60 * 1000));

    return sendBizMAlimtalk(phoneNumber, entry.tmplId, msg, {
      reserveDt,
      button: entry.button,
    });
  });
```

**`sendBizMAlimtalk` 시그니처 확장**:
```javascript
async function sendBizMAlimtalk(phoneNumber, tmplId, message, options = {}) {
  const { reserveDt = '00000000000000', button } = options;
  // ... (기존 인증/E.164/fallback 로직 동일) ...
  const payload = [{
    message_type: 'AT',
    phn: e164Phone,
    profile: profileKey,
    reserveDt,                            // 즉시 또는 5분 후 예약
    tmplId,
    msg: message,
    ...(button && { button }),            // 버튼 옵션 전달
    ...fallback,
  }];
  // ...
}
```

**`reserveDt` 포맷터** (KST 기준 14자리):
```javascript
function formatKSTReserveDt(date) {
  // Cloud Functions 런타임은 UTC. KST(UTC+9)로 변환 후 14자리 추출.
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const pad = n => String(n).padStart(2, '0');
  return (
    kst.getUTCFullYear() +
    pad(kst.getUTCMonth() + 1) +
    pad(kst.getUTCDate()) +
    pad(kst.getUTCHours()) +
    pad(kst.getUTCMinutes()) +
    pad(kst.getUTCSeconds())
  );
}
```

### 4.3 ✅ (적용 완료) 변수 치환 로직 추가

발송 직전 `msg` 문자열의 `#{변수명}` 토큰을 실제 값으로 치환.

```javascript
function substituteVariables(template, vars) {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.split(`#{${key}}`).join(value),
    template
  );
}

function formatKSTDate(date) {
  // YYYY-MM-DD (KST)
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const pad = n => String(n).padStart(2, '0');
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}`;
}
```

스케줄러(`sendRentalNotifications`) 측에도 동일 치환 호출 필요
(D-7/D-13 메시지에 `#{반납일}` 사용).

### 4.4 ⏳ (잔여) Firestore `biztalk` 배열에 day=0 추가

§2.6 인덱스 매핑대로 4개 원소 입력. day=0 항목은 BizM `remind00` 템플릿 심사 통과 후 추가.
→ 데이터 입력 작업 (§3.3-A.6).

### 4.5 🟡 SMS 대체발송 — 현황 및 활성화 방법

**현재 코드 상태** (`functions/index.js` L158-166):
SMS 대체발송 코드는 **이미 구현되어 있음**. 환경변수 `BIZM_SMS_SENDER` 설정 시에만
활성화되는 조건부 구조:

```javascript
const fallback = smsSender
  ? {
      smsKind: smsLength <= 90 ? 'S' : 'L',  // S=SMS(≤90B), L=LMS
      msgSms: message,                        // 알림톡과 동일 본문
      smsSender,                              // 발신 번호
    }
  : {};
```

→ **활성화 시 별도 코드 작성 불필요**. 환경변수만 추가하면 됨.

**활성화 절차**:
1. BizM 포털에서 SMS 발신번호 등록 (별도 본인 인증 필요)
2. BizM SMS 발송 단가 계약 (알림톡과 별도 과금)
3. `firebase functions:secrets:set BIZM_SMS_SENDER` (예: `0212345678`)
4. `runWith({ secrets: [..., 'BIZM_SMS_SENDER'] })` 바인딩에 포함 (§4.1)
5. 재배포

**향후 확장 (필요 시 주석 해제하여 사용)**:
LMS 발송 시 제목(`msgSubject`)을 별도 지정하거나 SMS 본문을 짧게 별도 작성하려면
다음 형태로 확장 가능. 해당 주석 코드는 `functions/index.js` L168-178에 이미 첨부되어 있음.

```javascript
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
```

### 4.6 ✅ (적용 완료) 버튼 옵션 전달 구조

`sendBizMAlimtalk(phn, tmplId, msg, { reserveDt, button })` 시그니처를 통해 옵션으로 전달.
스케줄러와 onCreate 트리거 모두 `biztalk` 원소의 `button` 필드가 있으면 그대로 BizM payload에 전달.
실제 버튼 부착은 BizM 템플릿 재심사 + Firestore 데이터 입력 시점에 활성화됨.

```javascript
// 예: D-179 분실 신고 버튼 (향후 데이터 입력 시)
{
  day: 179,
  message_type: "AT",
  tmplId: "reset01",
  msg: "리턴미컵을 분실하셨나요? ...",
  button: [
    {
      name: "분실 신고하기",
      type: "WL",                  // WL = 웹링크
      url_mobile: "https://...",
      url_pc: "https://..."
    }
  ]
}
```

### 4.7 🟡 동작 정확성 — 24시간 경계 (우선순위 매우 낮음)

사용자 결정에 따라 우선순위 매우 낮음. 대여 당일 메시지는 onCreate 기반이라 영향 없음.
D-7/D-13/D-179는 카페 영업시간 외 대여 발생률이 낮아 무시. 추후 필요 시
`startOfDay` 기반 계산으로 개선 가능.

### 4.8 🟡 중복 발송 방지 / 누락 보정

스케줄러 재시도 또는 `testAlimtalkNotification` HTTP 함수 임의 호출 시
중복 발송 가능. 또한 12:00 실행 실패 시 영구 누락.

**개선 방향** (현재 미적용):
- `alimtalk_sent/{rentId}_{day}` 마커 컬렉션으로 중복 방지
- 마커 기반으로 "최근 N일 내 미발송 day" 보정 함수 별도 작성

### 4.9 코드 품질 정리

| # | 위치 | 내용 | 상태 |
|---|---|---|---|
| a | `functions/index.js` L4 | `crypto` import 미사용 (Naver SENS 제거 후) — 삭제 | ✅ 2026-06-28 적용 |
| b | `functions/package.json` L19 | `"crypto": "^1.0.1"` deprecated npm 패키지 — 삭제 (Node 빌트인) | ✅ 2026-06-28 적용 |
| c | `firebase.json` L7 | Node 18은 EOL — 20/22 LTS로 업그레이드 권장 | ⏳ 미적용 (별도 배포 검토) |
| d | `functions/index.js` L182 | `message_type: 'AT'` — 첫 테스트에서 `K100` 응답 시 `'at'`(소문자) 시도 | ⏳ 운영 검증 시 확인 |

### 4.11 ✅ (적용 완료) 단계적 배포용 진단 로그 강화

단계적 배포 환경(시크릿 미설정/데이터 미입력/템플릿 미승인 상태)에서 어느 단계가
막혔는지 Cloud Functions 로그만 보고 진단 가능하도록 에러 로그를 강화. 모든 실패 경로는
graceful (조기 return, 예외 throw 없음).

**헬퍼**:
- `interpretBizMCode(code)` — L126-145. K100/K101/K107/K108/K200/K201/K202/E101~E105 등 12개 BizM 응답 코드에 진단 힌트 매핑
- `validateBiztalkEntry(entry, day)` — L151-172. `tmplId`/`msg`/`message_type` 필드 누락 시 어떤 필드인지 명시

**`sendBizMAlimtalk` 강화 포인트**:

| 시나리오 | 강화 내용 |
|---|---|
| 시크릿 미설정 | 누락 변수명 명시 + `firebase functions:secrets:set` 가이드 + `runWith` 바인딩 확인 안내 |
| 전화번호 형식 오류 | 타입/자릿수 검증 후 잘못된 값 노출 |
| BizM 에러 응답 | 코드/메시지 + 추정 원인 힌트 + tmplId/phn 컨텍스트 + 전체 응답 JSON |
| 네트워크 에러 | `ECONNABORTED`(타임아웃) / `ENOTFOUND`/`ECONNREFUSED`/`ECONNRESET`/`EAI_AGAIN` 구분 로그 |
| HTTP 4xx/5xx | 상태 코드 + statusText. 401/403은 인증 실패 추정 메시지 |
| 기타 예외 | error.message + stack trace |

**스케줄러 / onCreate 트리거 강화 포인트**:

| 시나리오 | 강화 내용 |
|---|---|
| `constants/bottle_club` 문서 없음 | 생성 가이드 + biztalk 입력 안내 |
| `biztalk` 배열 없음 | §2.6 인덱스 매핑 참고 안내 |
| 스케줄러 시작 시 | 등록된 day 값 목록(`day=[0,7,13,179]`) 출력 |
| biztalk 항목 검증 실패 | 누락된 필드명 명시 |
| `day=0` 항목 없음 (onCreate) | 현재 등록 day 목록 + 추가할 객체 형태 안내 |
| 사용자 미존재 | `uid` + `rentId` 함께 출력 |
| 전화번호 누락 | 누락 필드(`users/{uid}.mobile`) 명시 |

**단계적 배포 시 예상 로그 → 다음 조치 매핑**:

| Cloud Functions 로그 | 다음 조치 |
|---|---|
| `⚠️ BizM 시크릿 미설정: BIZM_USER_ID, ...` | §3.3-A.7 시크릿 등록 |
| `❌ constants/bottle_club.biztalk 배열이 존재하지 않습니다` | §3.3-A.6 데이터 입력 |
| `⚠️ biztalk day=0 항목이 없습니다` | biztalk[0] 추가 (remind00 심사 통과 후) |
| `❌ ... [K202] ...` (템플릿 미승인) | §3.3-A.5 BizM 템플릿 심사 대기 |
| `❌ ... [K200] ...` (프로필 키 무효) | §3.3-A.3 프로필 키 재발급 또는 시크릿 재등록 |
| `❌ ... [K107] ...` (userid 오류) | `BIZM_USER_ID` 시크릿 값 확인 |
| `❌ BizM API 연결 실패 [ENOTFOUND] ...` | 네트워크/DNS 또는 BizM 서버 점검 |

### 4.10 🟡 문서 정합성 — `REVIEW_REPORT.md` §7

보고서 §7의 다음 항목 수정 필요:

| 항목 | 보고서 (잘못) | 실제 (올바름) |
|---|---|---|
| Firestore 배열명 | `notifications` | `biztalk` |
| 메시지 필드명 | `body` | `msg` |
| 환경변수 설정 명령 | `firebase functions:config:set bizm.user_id=...` | `firebase functions:secrets:set BIZM_USER_ID` (+ `runWith` 바인딩) |

---

## 5. 미정 결정 사항

| # | 항목 | 비고 |
|---|---|---|
| 1 | 변수 식별자: `#{대여일}` (한국어) vs `#{rentedDate}` (영문) | BizM 심사는 둘 다 허용. 본 문서는 한국어 가정 |
| 2 | D-179 분실 신고 URL | 버튼 부착 시 필요. 본문 URL 노출 vs 버튼 부착 |
| 3 | SMS 대체발송 사용 여부 | §4.5 활성화 시 SMS 별도 과금 |
| 4 | 버튼 부착 시점 | 1차 배포 포함 vs 운영 후 재심사로 추가 |

---

## 6. 배포 체크리스트

> 코드 작업(§3.2)은 모두 완료됨. 아래 체크리스트는 §3.3의 잔여 작업을 실행 순서로 정리.

```
=== A. 사전 계약/인증 (외부) ===
[ ] 1. BizM 계정 발급 + 본인/사업자 인증, 정산 카드 등록 → BIZM_USER_ID 확보
[ ] 2. 카카오톡 비즈니스 채널 검수 완료
[ ] 3. BizM 포털 [서비스관리] → [발신프로필키] 발급 → BIZM_PROFILE_KEY 확보

=== B. 인프라 준비 ===
[ ] 4. Firebase 프로젝트 Blaze 요금제 활성화 (Cloud Functions 배포 필수)

=== C. 템플릿 심사 / 데이터 입력 ===
[ ] 5. BizM 포털 알림톡 템플릿 4건 등록 → tmplId 발급 (3~7일 소요)
       remind00 (대여 당일), remind01 (D-7), remind02 (D-1), reset01 (분실)
       ※ §1.2 본문 + §1.3 변수 식별자(#{대여일}, #{반납일})로 신고
[ ] 6. Firestore constants/bottle_club.biztalk 배열 4건 입력 (§2.6 인덱스 매핑)
       [0] day=0/remind00, [1] day=7/remind01, [2] day=13/remind02, [3] day=179/reset01

=== D. 시크릿 등록 + 배포 ===
[ ] 7. firebase functions:secrets:set BIZM_USER_ID
       firebase functions:secrets:set BIZM_PROFILE_KEY
       firebase functions:secrets:set BIZM_SMS_SENDER  (SMS 대체발송 사용 시)
[ ] 8. Cloud Scheduler/Pub/Sub/Eventarc API 활성화 확인 (보통 자동)
[ ] 9. cd functions && firebase deploy --only functions
       배포 함수: sendRentalNotifications, sendRentalNotificationOnCreate, testAlimtalkNotification

=== E. 운영 검증 ===
[ ] 10. BizM 포털에서 본인 휴대폰을 일회성 수신자로 등록 (당일 23:59까지 유효)
[ ] 11. 수동 테스트:
        - HTTP 호출: testAlimtalkNotification (스케줄러 동작 확인)
        - 실제 대여: rents 컬렉션에 source='web' 테스트 문서 생성 → 5분 후 알림 도착 확인
[ ] 12. Functions 로그에서 응답 코드 확인
        0000 → 성공
        K200/E102 → profile key 문제
        K107 → userid 형식 오류
        K100 → message_type 대소문자 (§4.9.d)
[ ] 13. 일회성 인증 해제 → BizM 운영 모드 전환 신청

=== F. 운영 권장 (선택) ===
[ ] 14. Cloud Monitoring 오류 알림 정책 등록 (Cloud Functions 실패 시 통보)
[ ] 15. BizM 발송 비용 모니터링 정기 점검 ([발송통계] 메뉴)
[ ] 16. 구세대 notifications 배열 마킹/제거 검토
```

---

> **현재 상태 (2026-06-28)**: 코드 작업 완료. 운영 배포를 위해서는 위 체크리스트
> A~D 단계(외부 계약, 인프라, 템플릿 심사, 데이터 입력, 시크릿 등록, 배포)가
> 순차적으로 진행되어야 함. **전체 일정의 가장 큰 변수는 BizM 템플릿 심사(3~7일).**
