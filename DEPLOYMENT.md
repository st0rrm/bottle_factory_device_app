# 배포 가이드

이 문서는 ReturnMeCup 애플리케이션을 Vercel (프론트엔드) + Render (백엔드)로 배포하는 방법을 설명합니다.

## 배포 구조

```
┌─────────────────┐       API 요청       ┌──────────────────┐
│                 │  ───────────────────> │                  │
│  Vercel         │                       │  Render          │
│  (프론트엔드)   │  <─────────────────── │  (백엔드 + DB)   │
│                 │       API 응답        │                  │
└─────────────────┘                       └──────────────────┘
```

---

## Part 1: 백엔드 배포 (Render)

### 1-1. GitHub 저장소 준비

```bash
git add .
git commit -m "Add Render deployment config"
git push origin main
```

### 1-2. Render 대시보드 설정

1. https://render.com 접속 및 로그인
2. **Dashboard** → **Blueprint** 선택
3. **"New Blueprint Instance"** 클릭
4. GitHub 저장소 연결
5. `render.yaml` 파일이 자동으로 감지됨
6. **"Apply"** 클릭

### 1-3. 데이터베이스 및 서버 생성

Render가 자동으로 생성:
- ✅ PostgreSQL 데이터베이스
- ✅ Node.js 웹 서버

배포 완료까지 약 5-10분 소요

### 1-4. 백엔드 URL 확인

배포가 완료되면 다음과 같은 URL을 받습니다:
```
https://returnmecup-api.onrender.com
```

**이 URL을 복사해두세요!** (다음 단계에서 사용)

### 1-5. 환경 변수 수정 (중요!)

Render 대시보드에서:
1. `returnmecup-api` 서비스 선택
2. **Environment** 탭 클릭
3. `CORS_ORIGIN` 수정:
   ```
   https://your-vercel-url.vercel.app
   ```
   (Vercel 배포 후 실제 URL로 변경)

4. **Save Changes** 클릭

---

## Part 2: 프론트엔드 배포 (Vercel)

### 2-1. `.env.production` 수정

`project1/.env.production` 파일을 열고 Render URL로 수정:

```env
VITE_API_BASE_URL=https://returnmecup-api.onrender.com/api
```

### 2-2. GitHub 푸시

```bash
git add .
git commit -m "Update production API URL"
git push origin main
```

### 2-3. Vercel 배포

1. https://vercel.com 접속 및 로그인
2. **"Add New Project"** 클릭
3. GitHub 저장소 선택
4. **Root Directory** 설정:
   - "Edit" 클릭
   - `project1` 입력
5. **Environment Variables** 추가:
   ```
   VITE_API_BASE_URL = https://returnmecup-api.onrender.com/api
   ```
6. **Deploy** 클릭

### 2-4. 프론트엔드 URL 확인

배포가 완료되면 다음과 같은 URL을 받습니다:
```
https://your-project.vercel.app
```

---

## Part 3: 최종 설정

### 3-1. CORS 설정 업데이트

Render 대시보드로 돌아가서:
1. `returnmecup-api` 서비스 선택
2. **Environment** 탭
3. `CORS_ORIGIN`을 Vercel URL로 수정:
   ```
   https://your-project.vercel.app
   ```
4. **Save Changes** 클릭

서버가 자동으로 재시작됩니다.

### 3-2. 배포 확인

브라우저에서 Vercel URL 접속:
```
https://your-project.vercel.app
```

테스트:
- ✅ 로그인 (admin / admin1234)
- ✅ 통계 조회
- ✅ 컵 대여/반납

---

## 트러블슈팅

### CORS 에러

**증상**: `Access to XMLHttpRequest has been blocked by CORS policy`

**해결**:
1. Render의 `CORS_ORIGIN`이 Vercel URL과 정확히 일치하는지 확인
2. 슬래시(`/`) 없이 입력했는지 확인
   - ✅ `https://your-project.vercel.app`
   - ❌ `https://your-project.vercel.app/`

### API 연결 실패

**증상**: 네트워크 에러 또는 500 에러

**해결**:
1. Render 서비스 상태 확인 (Dashboard에서 "Running" 상태인지)
2. Render 로그 확인:
   - Dashboard → `returnmecup-api` → **Logs** 탭
3. 환경 변수 확인:
   - `DB_HOST`, `DB_PASSWORD` 등이 올바르게 설정되었는지

### 데이터베이스 초기화 안됨

**증상**: 로그인 실패 (admin 계정 없음)

**해결**:
Render 대시보드에서 수동으로 SQL 실행:
1. `returnmecup-db` (PostgreSQL) 선택
2. **Shell** 탭 클릭
3. `server/database/init.sql` 내용 복사 & 실행

### Vercel 빌드 실패

**증상**: Deployment failed

**해결**:
1. Root Directory가 `project1`로 설정되었는지 확인
2. 환경 변수가 추가되었는지 확인
3. Vercel 로그 확인

---

## 비용

### 무료 플랜 제한

**Render (무료)**
- PostgreSQL: 1GB 스토리지
- Web Service: 750시간/월 (한 달 내내 켜둘 수 있음)
- 15분 비활성 후 자동 슬립 (첫 요청 시 느림)

**Vercel (무료)**
- 100GB 대역폭/월
- Serverless Functions 100GB-시간

### 유료 플랜이 필요한 경우

- 트래픽이 많아질 때 (월 수천 명 이상)
- 24/7 빠른 응답 필요 (Render 슬립 방지)
- 데이터베이스 1GB 초과

---

## 자동 배포 (CI/CD)

### Vercel
- `main` 브랜치에 push하면 자동 배포 ✅
- 환경 변수는 Vercel 대시보드에서 관리

### Render
- `main` 브랜치에 push하면 자동 배포 ✅
- 환경 변수는 Render 대시보드에서 관리

---

## 모니터링

### Render 로그 확인
```
Dashboard → returnmecup-api → Logs
```

### Vercel 로그 확인
```
Dashboard → Project → Deployments → 특정 배포 클릭 → Function Logs
```

---

## 배포 URL 예시

배포 완료 후 받게 될 URL:

**프론트엔드 (Vercel)**
```
https://returnmecup.vercel.app
```

**백엔드 (Render)**
```
https://returnmecup-api.onrender.com
```

**API 엔드포인트**
```
https://returnmecup-api.onrender.com/api/admin/login
https://returnmecup-api.onrender.com/api/statistics/my-stats
```

---

## 다음 단계

배포 후 할 일:
1. 🔐 관리자 비밀번호 변경
2. 📊 실제 카페 계정 생성
3. 📱 QR 코드 생성
4. 🧪 실제 디바이스에서 테스트

---

## 도움이 필요하신가요?

문제가 발생하면:
1. Render 로그 확인
2. Vercel 로그 확인
3. 브라우저 개발자 도구 (F12) → Console/Network 탭 확인
4. GitHub Issues에 질문 남기기
