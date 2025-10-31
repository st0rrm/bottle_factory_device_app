# 👥 팀원을 위한 프로젝트 설정 가이드

이 문서는 **다른 팀원이 이 프로젝트를 받아서 로컬에서 실행**할 때 필요한 설정입니다.

---

## 📋 사전 준비

1. Node.js 설치 (v18 이상 권장)
2. Git 설치
3. Firebase 계정 (Google 계정)

---

## 🚀 프로젝트 시작하기

### 1. 프로젝트 클론

```bash
git clone <이 저장소 URL>
cd bottle_factory_device_app
```

---

### 2. Firebase 서비스 계정 키 다운로드

⚠️ **중요: 이 파일은 Git에 포함되어 있지 않습니다!**

각 팀원이 **개별적으로** 다운로드해야 합니다.

#### 단계:

1. **Firebase 콘솔** 접속: https://console.firebase.google.com/
2. **bottler-project1** 프로젝트 클릭
3. **⚙️ 프로젝트 설정** → **서비스 계정** 탭
4. **새 비공개 키 생성** 클릭
5. 다운로드된 JSON 파일을 다음 위치에 저장:
   ```
   scripts/service-account.json
   ```

---

### 3. 프론트엔드 설정 (project1)

```bash
cd project1
npm install
```

`.env` 파일은 이미 Git에 포함되어 있으므로 별도 설정 불필요합니다.

**로컬 개발 서버 실행:**
```bash
npm run dev
```

---

### 4. 백엔드 설정 (server)

```bash
cd server
npm install
```

**서버 실행:**
```bash
npm start
```

---

### 5. Firestore 초기 데이터 생성 (선택)

이미 Firestore에 데이터가 있다면 이 단계는 건너뛰세요.

새 환경이거나 초기화가 필요하면:

```bash
# 루트 디렉토리에서
npm install firebase-admin
node scripts/init-firebase.js
```

---

## 🔑 Firebase 권한 요청

Firebase 프로젝트에 접근하려면 **프로젝트 관리자에게 권한을 요청**하세요.

### 관리자가 할 일:

1. Firebase 콘솔 → **bottler-project1**
2. **⚙️ 프로젝트 설정** → **사용자 및 권한**
3. **구성원 추가**
4. 팀원의 Google 계정 이메일 입력
5. 역할: **편집자** 또는 **뷰어** 선택
6. **초대** 클릭

### 팀원이 할 일:

1. 이메일로 받은 초대 수락
2. Firebase 콘솔에서 프로젝트 접근 가능 확인
3. 서비스 계정 키 다운로드 (위 2번 단계)

---

## 📁 중요한 파일들

### ✅ Git에 포함됨 (공유 가능):
- `project1/` - 프론트엔드 코드
- `server/` - 백엔드 코드
- `scripts/init-firebase.js` - 초기화 스크립트
- `FIREBASE-SETUP-GUIDE.md` - Firebase 설정 가이드
- `firestore.rules` - Firestore 보안 규칙

### ❌ Git에 포함 안 됨 (각자 설정):
- `scripts/service-account.json` - **절대 공유 금지!**
- `.env.local` - 로컬 환경 변수
- `node_modules/` - 자동 설치됨

---

## 🚨 보안 주의사항

### 절대 Git에 커밋하면 안 되는 것:

```
❌ scripts/service-account.json
❌ .env (민감한 정보 포함 시)
❌ Firebase API 키 (공개 저장소일 경우)
```

### 확인하는 방법:

```bash
git status
```

위 명령어로 `service-account.json`이 보이면 **절대 커밋하지 마세요!**

---

## 💬 문제 해결

### Q: "service-account.json을 찾을 수 없습니다" 오류

**A:** Firebase 콘솔에서 키를 다운로드하고 `scripts/service-account.json`으로 저장하세요.

### Q: Firebase 권한이 없다고 나옴

**A:** 프로젝트 관리자에게 Firebase 프로젝트 권한을 요청하세요.

### Q: Vercel 배포는 어떻게 하나요?

**A:** Vercel 접근 권한이 필요합니다. 프로젝트 관리자에게 요청하세요.

---

## 📞 연락처

문제가 생기면 프로젝트 관리자에게 연락하세요:
- **프로젝트 관리자**: [이름 / 연락처]
- **Firebase 프로젝트**: bottler-project1
- **Vercel 프로젝트**: returnme-cup-device-app

---

**작성일**: 2025-10-31
