# Firebase Cloud Functions SMS 알림 설정 가이드

Firebase Cloud Functions를 사용하여 웹 앱 사용자에게 SMS 반납 알림을 자동으로 발송합니다.

## 📋 사전 준비

### 1. Firebase CLI 설치

```bash
npm install -g firebase-tools
```

### 2. Firebase 로그인

```bash
firebase login
```

### 3. Firebase 프로젝트 확인

```bash
firebase projects:list
```

`zero-club` 프로젝트가 보이는지 확인하세요.

---

## 🔧 네이버 SENS 설정

### 1. 네이버 클라우드 플랫폼 가입

1. https://www.ncloud.com 접속
2. 회원가입 및 로그인
3. 결제 수단 등록 (무료 크레딧 제공)

### 2. API 인증키 생성

1. https://console.ncloud.com/mc/solution/naverService/application 접속
2. "Application 등록" 클릭
3. Application 이름 입력
4. **Access Key ID**와 **Secret Key** 복사 (한 번만 보임!)

### 3. SENS 서비스 생성

1. https://console.ncloud.com/sens/sms 접속
2. "프로젝트 생성" 또는 기존 프로젝트 선택
3. "SMS 서비스 생성" 클릭
4. 서비스 이름 입력 (예: `bottleclub-sms`)
5. **Service ID** 복사 (형식: `ncp:sms:kr:xxxxxxxxxxxxx:bottleclub-sms`)

### 4. 발신번호 등록

1. SENS 콘솔에서 "발신번호 등록" 클릭
2. 전화번호 입력 (예: 010-1234-5678)
3. 본인 인증 (SMS 인증 또는 서류 제출)
4. 승인 대기 (보통 1-2시간, 영업일 기준)

### 5. 비용 확인

- SMS(단문): **건당 8원**
- LMS(장문): 건당 24원
- 무료 크레딧으로 충분히 테스트 가능

---

## 🚀 Firebase Functions 배포

### 1. 함수 디렉토리로 이동 및 패키지 설치

```bash
cd functions
npm install
```

### 2. Firebase 환경변수 설정

**중요:** `.env` 파일은 로컬 테스트용이고, 배포 시에는 Firebase Config를 사용해야 합니다.

```bash
# Firebase Functions 환경변수 설정
firebase functions:config:set \
  naver.sens_service_id="ncp:sms:kr:xxxxxxxxxxxxx:bottleclub-sms" \
  naver.sens_access_key="your-access-key-here" \
  naver.sens_secret_key="your-secret-key-here" \
  naver.sens_calling_number="01012345678"
```

설정 확인:

```bash
firebase functions:config:get
```

### 3. Functions 배포

```bash
# 프로젝트 루트에서 실행
firebase deploy --only functions
```

배포 완료 후 출력:
```
✔ functions[asia-northeast3-sendRentalNotifications]: Scheduled function deployed successfully
✔ functions[asia-northeast3-testSmsNotification]: HTTP function deployed successfully
```

### 4. Cloud Scheduler 확인

Firebase Console에서 자동으로 Cloud Scheduler가 생성됩니다:
- https://console.firebase.google.com/project/zero-club/functions
- 스케줄: 매일 12:00 (한국 시간)
- 리전: asia-northeast3

---

## 🧪 테스트

### 방법 1: HTTP 함수로 수동 테스트

배포된 함수를 즉시 실행해봅니다:

```bash
# Functions URL 확인
firebase functions:list

# 또는 브라우저에서 접속
# https://asia-northeast3-zero-club.cloudfunctions.net/testSmsNotification
```

### 방법 2: 로컬 에뮬레이터 테스트

```bash
cd functions
npm install

# 에뮬레이터 실행
firebase emulators:start --only functions

# 다른 터미널에서 HTTP 함수 호출
curl http://localhost:5001/zero-club/asia-northeast3/testSmsNotification
```

**주의:** 로컬 테스트 시에도 실제 SMS가 발송되므로 비용이 발생합니다!

### 방법 3: Firebase Console에서 수동 실행

1. https://console.firebase.google.com/project/zero-club/functions 접속
2. `sendRentalNotifications` 함수 클릭
3. "테스트" 탭에서 "함수 실행" 클릭

---

## 📊 모니터링 및 로그

### Firebase Console에서 로그 확인

1. https://console.firebase.google.com/project/zero-club/functions/logs 접속
2. `sendRentalNotifications` 함수 선택
3. 실행 기록 및 에러 확인

### CLI로 로그 확인

```bash
# 실시간 로그 스트리밍
firebase functions:log

# 특정 함수 로그만 보기
firebase functions:log --only sendRentalNotifications
```

---

## ⚠️ 주의사항

### 1. Firestore 데이터 구조 확인

배포 전에 zero-club Firebase에서 다음을 확인하세요:

**constants.bottle_club 문서:**
```javascript
{
  notifications: [
    {
      day: 7,
      title: "리턴미 컵 반납 안내 (D-7)",
      body: "리턴미 컵이 아직 반납되지 않았어요!\n반납장소를 확인 후 컵을 반납해주세요."
    },
    {
      day: 13,
      title: "리턴미 컵 반납 안내 (D-1)",
      body: "리턴미 컵 반납 일이 하루 남았어요!\n반납장소를 확인 후 컵을 반납해주세요."
    },
    {
      day: 179,
      title: "리턴미 컵 자동분실 안내",
      body: "내일이면 컵을 대여한 지 180일이 됩니다.\n180일이 지나면 분실 처리되니 확인해주세요."
    }
  ]
}
```

**users 컬렉션:**
- `mobile` 필드가 있는지 확인 (예: "01012345678")

**rents 컬렉션:**
- 웹에서 대여한 건은 `source: 'web'` 필드가 있어야 함
- 앱에서 대여한 건은 `source` 필드 없음 → 푸시 알림만 발송

### 2. 비용 관리

- **SMS 발송 비용**: 건당 8원
- **Cloud Functions 호출**: 매일 1회 실행 (거의 무료)
- **Firestore 읽기**: 대여 건수만큼 읽기 발생

예상 비용 (일 100건 대여, 10% SMS 발송):
- SMS: 10건 × 8원 = 80원/일
- Cloud Functions: 무료 (월 2백만 호출 무료)
- Firestore: 100 reads/day = 무료 (일 5만 read 무료)

**월 예상 비용: 약 2,400원 (SMS만)**

### 3. 발신번호 스팸 차단 방지

- 080 수신거부 번호 표시 (법적 의무)
- 광고성 메시지 아님을 명시
- 야간(21시~8시) 발송 자제

---

## 🔄 업데이트 및 재배포

코드 수정 후 재배포:

```bash
cd functions
firebase deploy --only functions
```

환경변수만 변경:

```bash
firebase functions:config:set naver.sens_calling_number="01087654321"
firebase deploy --only functions
```

---

## 🆘 문제 해결

### SMS가 발송되지 않음

1. Firebase Functions 로그 확인
   ```bash
   firebase functions:log --only sendRentalNotifications
   ```

2. 네이버 SENS 콘솔에서 발송 내역 확인
   - https://console.ncloud.com/sens/sms

3. 환경변수 확인
   ```bash
   firebase functions:config:get
   ```

4. 발신번호 승인 상태 확인
   - SENS 콘솔 → 발신번호 관리

### "인증 실패" 오류

- Access Key와 Secret Key가 정확한지 확인
- SENS Service ID가 정확한지 확인
- API 권한이 활성화되어 있는지 확인

### "발신번호 미등록" 오류

- SENS 콘솔에서 발신번호가 "승인됨" 상태인지 확인
- 환경변수의 전화번호 형식 확인 (하이픈 제거: 01012345678)

---

## 📚 참고 문서

- [Firebase Cloud Functions 문서](https://firebase.google.com/docs/functions)
- [네이버 클라우드 SENS 문서](https://api.ncloud-docs.com/docs/ai-application-service-sens-smsv2)
- [Firebase Cloud Scheduler](https://firebase.google.com/docs/functions/schedule-functions)
