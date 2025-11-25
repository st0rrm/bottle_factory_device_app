# Firebase Service Account 설정

서버가 Firebase에 접근하려면 **zero-club** 프로젝트의 Service Account 키가 필요합니다.

## 🔑 Service Account 키 다운로드

### 1. Firebase Console 접속

https://console.firebase.google.com/project/zero-club/settings/serviceaccounts/adminsdk

### 2. 새 비공개 키 생성

1. "새 비공개 키 생성" 버튼 클릭
2. JSON 파일 다운로드
3. 파일명을 `service-account.json`으로 변경
4. 이 파일을 `scripts/` 디렉토리에 저장

```bash
# 파일 경로
bottle_factory_device_app/
  └── scripts/
      └── service-account.json  ← 여기에 저장
```

### 3. 보안 주의사항

⚠️ **절대로 Git에 커밋하지 마세요!**

`.gitignore`에 이미 추가되어 있습니다:
```
scripts/service-account.json
```

## 🚀 운영 환경 배포

운영 서버(Vercel, Render 등)에서는 파일 대신 **환경변수**를 사용하세요.

### 환경변수 설정

```bash
# service-account.json 파일 내용을 한 줄로 변환
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"zero-club",...}'
```

서버 코드(`server/src/config/firebase.js`)는 자동으로 환경변수를 우선 사용합니다:
1. `FIREBASE_SERVICE_ACCOUNT` 환경변수가 있으면 사용
2. 없으면 `scripts/service-account.json` 파일 사용

## ✅ 확인

서버 실행 시 다음 메시지가 나오면 성공:
```
✅ Firebase initialized with local service account file
```

또는 환경변수 사용 시:
```
✅ Firebase initialized with environment variable
```
