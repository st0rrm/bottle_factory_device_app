# PostgreSQL 마이그레이션 가이드

이 프로젝트는 SQLite에서 PostgreSQL로 마이그레이션되었습니다.

## 사전 요구사항

- Docker Desktop 설치됨 ✅
- Node.js 설치됨

## 시작하기

### 1. Docker Desktop 실행

Docker Desktop을 시작 메뉴에서 실행하거나, 다음 명령어로 확인:

```bash
docker --version
```

### 2. PostgreSQL 데이터베이스 시작

프로젝트 루트 디렉토리에서:

```bash
docker-compose up -d
```

데이터베이스가 정상적으로 시작되었는지 확인:

```bash
docker-compose ps
```

### 3. 의존성 설치

서버 디렉토리로 이동:

```bash
cd server
npm install
```

### 4. 서버 실행

개발 모드로 실행:

```bash
npm run dev
```

또는 프로덕션 모드:

```bash
npm start
```

## 데이터베이스 정보

### 기본 설정

- **Host**: localhost
- **Port**: 5432
- **Database**: returnmecup_db
- **User**: returnmecup
- **Password**: returnmecup2024

### 기본 관리자 계정

- **Username**: admin
- **Password**: admin1234

## Docker 명령어

### PostgreSQL 시작
```bash
docker-compose up -d
```

### PostgreSQL 중지
```bash
docker-compose down
```

### PostgreSQL 재시작
```bash
docker-compose restart
```

### 로그 확인
```bash
docker-compose logs -f postgres
```

### 데이터베이스 완전 삭제 (데이터 포함)
```bash
docker-compose down -v
```

## 직접 데이터베이스 접속

PostgreSQL CLI로 접속:

```bash
docker exec -it returnmecup-db psql -U returnmecup -d returnmecup_db
```

유용한 psql 명령어:
- `\dt` - 테이블 목록 조회
- `\d table_name` - 테이블 구조 조회
- `SELECT * FROM admins;` - admins 테이블 데이터 조회
- `\q` - 종료

## 변경 사항

### 코드 변경사항

1. **database.js**: SQLite → PostgreSQL connection pool
2. **모든 Model 파일**: callback → async/await
3. **모든 Route 파일**: callback → async/await
4. **package.json**: sqlite3 → pg

### SQL 변경사항

- `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`
- `TEXT` → `VARCHAR` (필요시)
- `DATETIME DEFAULT CURRENT_TIMESTAMP` → `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- `DATE('now')` → `CURRENT_DATE`
- `DATE('now', '-7 days')` → `CURRENT_DATE - INTERVAL '7 days'`
- Parameterized queries: `?` → `$1, $2, ...`

## 환경 변수 (.env)

server/.env 파일:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Secret Key (Change this in production!)
JWT_SECRET=returnmecup-secret-key-change-in-production-2024

# PostgreSQL Database Configuration
DB_USER=returnmecup
DB_HOST=localhost
DB_NAME=returnmecup_db
DB_PASSWORD=returnmecup2024
DB_PORT=5432

# CORS
CORS_ORIGIN=http://localhost:5173,http://localhost:5174
```

## 배포 시 고려사항

### Docker 없이 배포하는 경우

클라우드 PostgreSQL 서비스 사용:
- **Supabase** (무료 tier: 500MB)
- **Neon** (무료 tier)
- **Railway** (무료 tier)

.env 파일의 DB_HOST를 클라우드 서비스 URL로 변경:

```env
DB_HOST=your-database-host.supabase.co
DB_USER=postgres
DB_PASSWORD=your-secure-password
DB_NAME=postgres
DB_PORT=5432
```

### Docker와 함께 배포하는 경우

docker-compose.yml을 그대로 사용하여 배포 서버에서:

```bash
docker-compose up -d
```

## 문제 해결

### Docker Desktop이 시작되지 않는 경우

1. 컴퓨터 재부팅
2. Windows 기능에서 "Hyper-V" 활성화
3. BIOS에서 가상화 기술 활성화

### "docker: command not found" 에러

1. Docker Desktop이 실행 중인지 확인
2. 터미널 재시작
3. PATH 환경 변수 확인

### 데이터베이스 연결 오류

1. Docker 컨테이너 상태 확인: `docker-compose ps`
2. 로그 확인: `docker-compose logs postgres`
3. .env 파일의 DB 설정 확인

### 포트 충돌 (5432 already in use)

다른 PostgreSQL이 이미 실행 중일 수 있습니다:
- Windows 서비스에서 PostgreSQL 중지
- docker-compose.yml에서 포트 변경: `"5433:5432"`

## 추가 도움말

문제가 계속되면:
1. Docker Desktop 재시작
2. `docker-compose down && docker-compose up -d`로 컨테이너 재생성
3. `docker system prune`로 사용하지 않는 리소스 정리
