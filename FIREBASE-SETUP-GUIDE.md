# 🔥 Firebase 설정 완료 가이드

## ✅ 이미 완료된 작업

1. ✅ `.env.production` 파일 생성됨
2. ✅ `firestore.rules` 보안 규칙 파일 생성됨
3. ✅ `scripts/init-firebase.js` 초기화 스크립트 생성됨
4. ✅ 신규 사용자 무료 대여권 자동 지급 코드 추가됨 (`firestore.js`)

---

## 📋 남은 작업 (순서대로 진행)

### 1️⃣ Firebase 서비스 계정 키 다운로드 (2분)

1. **Firebase 콘솔** 접속: https://console.firebase.google.com/
2. **bottler-project1** 프로젝트 클릭
3. **⚙️ 프로젝트 설정** (톱니바퀴 아이콘) 클릭
4. **서비스 계정** 탭 클릭
5. **새 비공개 키 생성** 버튼 클릭
6. **키 생성** 확인
7. 다운로드된 JSON 파일을 **`scripts/service-account.json`** 으로 저장

```bash
# 파일 위치 확인
C:\github\bottle_factory_device_app\scripts\service-account.json
```

---

### 2️⃣ Firestore 초기 데이터 생성 (1분)

서비스 계정 키를 다운로드한 후:

```bash
# 프로젝트 루트로 이동
cd C:\github\bottle_factory_device_app

# Firebase Admin SDK 설치 (한 번만)
npm install firebase-admin

# 초기화 스크립트 실행
node scripts/init-firebase.js
```

**실행 결과:**
```
✅ Firebase Admin 초기화 완료
✅ 다회용 컵 생성: xxx
✅ 텀블러 생성: xxx
✅ 테스트 카페 생성: test-cafe-01
✅ 무료 대여권 생성: xxx
✅ 유료 대여권 생성: xxx
✅ 상수 설정 완료
✨ Firestore 초기화 완료!
```

---

### 3️⃣ Firestore 보안 규칙 설정 (1분)

1. **Firebase 콘솔** → **Firestore Database** 클릭
2. **규칙** 탭 클릭
3. 기존 규칙을 모두 삭제
4. **`firestore.rules`** 파일 내용을 복사해서 붙여넣기
5. **게시** 버튼 클릭

---

### 4️⃣ Vercel 환경 변수 설정 (3분)

1. **Vercel 대시보드** 접속: https://vercel.com/dashboard
2. **returnme-cup-device-app** 프로젝트 선택
3. **Settings** → **Environment Variables** 클릭
4. **`VERCEL-ENV-VARS.txt`** 파일을 열고, 변수를 하나씩 추가:

```
Name: VITE_FIREBASE_API_KEY
Value: AIzaSyANhU9zSCF3ry8afgOGBXSvP_d-5ZX-4DE
Environment: Production
```

총 10개 변수를 추가하세요 (파일 참고).

5. **Save** 클릭 후 자동 재배포 대기

---

### 5️⃣ 배포 확인 (1분)

Vercel 재배포 완료 후:

1. https://returnme-cup-device-app.vercel.app 접속
2. 로그인 화면이 정상적으로 보이는지 확인
3. 테스트 전화번호로 로그인 시도

---

## 🧪 테스트 방법

### Firebase 전화 인증 테스트 전화번호 추가

실제 SMS를 받지 않고 테스트하려면:

1. **Firebase 콘솔** → **Authentication** → **Sign-in method**
2. **전화** 클릭
3. 아래로 스크롤 → **테스트 전화번호** 섹션
4. **전화번호 추가**:
   - 전화번호: `+821012345678`
   - 인증 코드: `123456`
5. **추가** 클릭

이제 앱에서 `010-1234-5678` 입력 후 인증 코드 `123456` 입력하면 바로 로그인됩니다!

---

## 📊 Firestore 데이터 확인

Firebase 콘솔 → Firestore Database에서 확인:

### ✅ 생성된 컬렉션:

- `items` (2개 문서: 다회용 컵, 텀블러)
- `shops` (1개 문서: test-cafe-01)
- `goods` (2개 문서: 무료 대여권, 유료 대여권)
- `settings` (1개 문서: constants)

### ✅ 신규 사용자 가입 시 자동 생성:

- `users/{uid}` (사용자 정보)
- `goods_history/{id}` (무료 대여권 1개 자동 지급)

---

## 🚨 문제 해결

### Q: "service-account.json을 찾을 수 없습니다" 오류

**해결:** Firebase 콘솔에서 서비스 계정 키를 다운로드하고 `scripts/service-account.json`으로 저장하세요.

### Q: Vercel 배포 후에도 "vite-project"만 보임

**해결:**
1. Vercel 환경 변수가 모두 설정되었는지 확인
2. Vercel → Deployments → 최신 배포 → **Redeploy** 클릭

### Q: 로그인 시 "사용 가능한 대여권이 없습니다" 오류

**해결:**
1. Firestore 초기화 스크립트 실행했는지 확인
2. Firebase 콘솔에서 `goods` 컬렉션에 무료 대여권이 있는지 확인
3. 브라우저 콘솔(F12)에서 오류 확인

---

## 🎯 다음 단계

모든 설정이 완료되면:

1. ✅ 전화번호 인증 테스트
2. ✅ 신규 가입 시 무료 대여권 지급 확인
3. ✅ 대여 기능 테스트
4. ⏳ 반납 기능 구현 (다음 작업)
5. ⏳ 보틀 적립 기능 구현 (향후 작업)

---

## 📞 문의

문제가 발생하면 다음 정보를 확인하세요:

1. **브라우저 콘솔** (F12 → Console 탭)
2. **Vercel 배포 로그** (Vercel Dashboard → Deployments)
3. **Firebase 콘솔 로그** (Firebase Console → Functions 또는 Firestore)

---

**작성일:** 2025-10-31
**Firebase 프로젝트:** bottler-project1
**Vercel 프로젝트:** returnme-cup-device-app
