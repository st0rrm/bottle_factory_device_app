# Dev 브랜치 배포 가이드

이 문서는 **dev 브랜치**를 Vercel (프론트엔드) + Render (백엔드)로 배포하는 방법을 설명합니다.

---

## 배포 구조

```
GitHub (dev 브랜치)
    ↓
Vercel (프론트엔드) → https://returnmecup-dev.vercel.app
    ↓ API 요청
Render (백엔드) → https://returnmecup-api-dev.onrender.com
    ↓
PostgreSQL (개발 DB)
```

---

## Part 1: 백엔드 배포 (Render)

### 1-1. Render 계정 생성 및 로그인
1. https://render.com 접속
2. GitHub 계정으로 로그인

### 1-2. PostgreSQL 데이터베이스 생성
1. Dashboard → **New +** → **PostgreSQL** 선택
2. 설정:
   - **Name**: `returnmecup-db-dev`
   - **Database**: `returnmecup_db`
   - **User**: `returnmecup`
   - **Region**: Singapore (가까운 지역)
   - **Plan**: Free
3. **Create Database** 클릭
4. 생성 후 데이터베이스 정보 복사:
   - Internal Database URL
   - Host
   - Port
   - Database
   - Username
   - Password

### 1-3. 데이터베이스 초기화
1. Render 대시보드에서 `returnmecup-db-dev` 선택
2. **Shell** 탭 클릭
3. 다음 명령어로 SQL 파일 실행:
```bash
psql $DATABASE_URL < init.sql
```

또는 `server/database/init.sql` 파일 내용을 복사해서 Shell에 직접 붙여넣기

### 1-4. 백엔드 웹 서비스 생성
1. Dashboard → **New +** → **Web Service** 선택
2. GitHub 저장소 연결
3. 설정:
   - **Name**: `returnmecup-api-dev`
   - **Region**: Singapore
   - **Branch**: `dev` ⚠️ 중요!
   - **Root Directory**: 비워두기
   - **Runtime**: Node
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Plan**: Free

4. **Environment Variables** 추가:
   ```
   NODE_ENV = production
   PORT = 3000
   JWT_SECRET = [자동 생성 또는 직접 입력]
   DB_HOST = [1-2에서 복사한 Host]
   DB_PORT = [1-2에서 복사한 Port]
   DB_NAME = returnmecup_db
   DB_USER = returnmecup
   DB_PASSWORD = [1-2에서 복사한 Password]
   CORS_ORIGIN = https://returnmecup-dev.vercel.app
   ```

5. **Create Web Service** 클릭

### 1-5. 배포 완료 대기
- 약 5-10분 소요
- 배포 완료 후 URL 확인: `https://returnmecup-api-dev.onrender.com`
- **이 URL을 복사해두세요!** (다음 단계에서 사용)

### 1-6. API 테스트
브라우저나 curl로 헬스체크:
```bash
curl https://returnmecup-api-dev.onrender.com/health
```

응답 예시:
```json
{"status":"ok","timestamp":"2024-10-30T00:00:00.000Z"}
```

---

## Part 2: 프론트엔드 배포 (Vercel)

### 2-1. 프로젝트 환경 변수 파일 업데이트

로컬에서 `.env.production` 파일을 수정:

```bash
# project1/.env.production
VITE_API_BASE_URL=https://returnmecup-api-dev.onrender.com/api
```

변경 후 커밋:
```bash
git add project1/.env.production
git commit -m "Update production API URL for dev deployment"
git push origin dev
```

### 2-2. Vercel 계정 생성 및 프로젝트 연결
1. https://vercel.com 접속
2. GitHub 계정으로 로그인
3. **Add New...** → **Project** 클릭
4. GitHub 저장소 선택: `bottle_factory_device_app`
5. **Import** 클릭

### 2-3. 프로젝트 설정
1. **Framework Preset**: Vite 자동 감지됨
2. **Root Directory**: `project1` 입력 (Edit 버튼 클릭 후)
3. **Build Command**: `npm run build` (자동)
4. **Output Directory**: `dist` (자동)
5. **Install Command**: `npm install` (자동)

### 2-4. 환경 변수 설정
**Environment Variables** 추가:
```
VITE_API_BASE_URL = https://returnmecup-api-dev.onrender.com/api
```

### 2-5. Git 브랜치 설정 (중요!)
1. **Settings** → **Git** 탭
2. **Production Branch**: `dev` 선택 ⚠️
   - 또는 처음에는 기본값으로 두고, dev 브랜치 푸시 시 자동 배포되도록 설정

### 2-6. 배포
**Deploy** 클릭하면 자동으로 빌드 및 배포 시작

배포 완료 후:
- Production URL: `https://returnmecup-dev.vercel.app` (또는 자동 생성된 URL)
- 프로젝트 이름은 Vercel이 자동으로 생성하거나 직접 변경 가능

### 2-7. 커스텀 도메인 (선택사항)
Settings → Domains에서 커스텀 도메인 추가 가능

---

## Part 3: CORS 설정 업데이트

Vercel 배포가 완료되면 실제 URL이 나옵니다.

### 3-1. Render에서 CORS 업데이트
1. Render 대시보드 → `returnmecup-api-dev` 선택
2. **Environment** 탭
3. `CORS_ORIGIN` 값을 Vercel URL로 수정:
   ```
   https://returnmecup-dev.vercel.app
   ```
   (슬래시 없이, 정확한 Vercel URL 입력)
4. **Save Changes** 클릭
5. 서비스 자동 재시작 (약 1분)

---

## Part 4: 배포 확인 및 테스트

### 4-1. 프론트엔드 접속
브라우저에서 Vercel URL 접속:
```
https://returnmecup-dev.vercel.app
```

### 4-2. 로그인 테스트
**관리자 계정**:
- ID: `admin`
- PW: `admin1234`

**카페 계정**:
- ID: `demo-cafe1`
- PW: `demo1234`

### 4-3. 기능 테스트 체크리스트
- [ ] 카페 로그인
- [ ] 관리자 로그인
- [ ] 카페 추가 (관리자)
- [ ] 통계 조회
- [ ] 컵 대여/반납 기능
- [ ] QR 코드 모드 전환
- [ ] 전화번호 입력 모드 전환

---

## 자동 배포 (CI/CD)

### Vercel 자동 배포
`dev` 브랜치에 푸시할 때마다 자동으로 재배포:
```bash
git add .
git commit -m "Update feature"
git push origin dev
```
→ Vercel이 자동으로 감지하고 빌드 시작

### Render 자동 배포
`dev` 브랜치에 푸시할 때마다 자동으로 재배포:
```bash
git push origin dev
```
→ Render가 자동으로 감지하고 빌드 시작

---

## 트러블슈팅

### 1. CORS 에러
**증상**: `Access to XMLHttpRequest has been blocked by CORS policy`

**해결**:
1. Render의 `CORS_ORIGIN`이 Vercel URL과 정확히 일치하는지 확인
2. 슬래시(`/`) 없이 입력했는지 확인
   - ✅ `https://returnmecup-dev.vercel.app`
   - ❌ `https://returnmecup-dev.vercel.app/`
3. Render 서비스 재시작

### 2. API 연결 실패
**증상**: 네트워크 에러 또는 500 에러

**해결**:
1. Render 서비스 상태 확인 (Dashboard에서 "Running" 상태인지)
2. Render 로그 확인:
   - Dashboard → `returnmecup-api-dev` → **Logs** 탭
3. 환경 변수 확인:
   - `DB_HOST`, `DB_PASSWORD` 등이 올바르게 설정되었는지

### 3. 데이터베이스 연결 실패
**증상**: `Error: connect ECONNREFUSED`

**해결**:
1. Render PostgreSQL이 "Available" 상태인지 확인
2. 환경 변수의 DB 정보가 정확한지 확인
3. 무료 플랜 제한 (동시 연결 수) 확인

### 4. Vercel 빌드 실패
**증상**: Deployment failed

**해결**:
1. Root Directory가 `project1`로 설정되었는지 확인
2. 환경 변수가 추가되었는지 확인
3. Vercel 로그 확인 (Deployments → 실패한 배포 클릭)

### 5. Render 슬립 모드
**증상**: 첫 요청이 느림 (15-30초)

**원인**: 무료 플랜은 15분 비활성 후 슬립 모드

**해결**:
- 정상 동작 (무료 플랜 제한)
- 유료 플랜으로 업그레이드 시 해결

---

## 비용

### 무료 플랜 제한

**Render (무료)**
- PostgreSQL: 1GB 스토리지
- Web Service: 750시간/월
- 15분 비활성 후 슬립 모드

**Vercel (무료)**
- 100GB 대역폭/월
- Serverless Functions 실행 시간 제한

---

## 다음 단계

배포 완료 후:
1. 🔐 관리자 비밀번호 변경 권장
2. 📊 실제 카페 계정 생성
3. 🧪 모든 기능 테스트
4. 🐛 버그 발견 시 dev 브랜치에서 수정 → 자동 재배포
5. ✅ 안정화되면 main 브랜치로 병합 → Production 배포

---

## 모니터링

### Render 로그 확인
```
Dashboard → returnmecup-api-dev → Logs
```

### Vercel 로그 확인
```
Dashboard → Project → Deployments → 특정 배포 클릭 → Function Logs
```

---

## 배포 URL 정리

배포 완료 후 받게 될 URL:

**프론트엔드 (Vercel)**
```
https://returnmecup-dev.vercel.app
```

**백엔드 (Render)**
```
https://returnmecup-api-dev.onrender.com
```

**API 엔드포인트 예시**
```
https://returnmecup-api-dev.onrender.com/api/admin/login
https://returnmecup-api-dev.onrender.com/api/cafe/login
https://returnmecup-api-dev.onrender.com/api/statistics/my-stats
```
