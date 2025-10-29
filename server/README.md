# ReturnMeCup API Server

관리자와 카페 계정 관리를 위한 백엔드 서버입니다.

## 설치 방법

```bash
cd server
npm install

# .env 파일 설정 (처음 한 번만)
cp .env.example .env
# 또는 Windows에서: copy .env.example .env

# .env 파일을 열어서 JWT_SECRET을 변경하세요!
```

## 실행 방법

### 개발 모드 (nodemon)
```bash
npm run dev
```

### 프로덕션 모드
```bash
npm start
```

서버는 기본적으로 `http://localhost:3000`에서 실행됩니다.

## 기본 관리자 계정

서버를 처음 실행하면 기본 관리자 계정이 자동으로 생성됩니다:

- **아이디**: `admin`
- **비밀번호**: `admin1234`

⚠️ **보안 주의**: 프로덕션 환경에서는 반드시 비밀번호를 변경하세요!

## API 엔드포인트

### 관리자 API

#### 관리자 로그인
```http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin1234"
}
```

응답:
```json
{
  "token": "jwt-token-here",
  "admin": {
    "id": 1,
    "username": "admin",
    "email": "admin@returnmecup.com"
  }
}
```

#### 현재 관리자 정보 조회
```http
GET /api/admin/me
Authorization: Bearer {token}
```

### 카페 API

#### 카페 로그인
```http
POST /api/cafe/login
Content-Type: application/json

{
  "cafeId": "cafe001",
  "password": "cafepassword"
}
```

응답:
```json
{
  "token": "jwt-token-here",
  "cafe": {
    "id": 1,
    "cafeId": "cafe001",
    "cafeName": "커피포임팩트",
    "firebaseRef": "cafes/cafe001"
  }
}
```

#### 카페 목록 조회 (관리자 전용)
```http
GET /api/cafe
Authorization: Bearer {admin-token}
```

#### 카페 생성 (관리자 전용)
```http
POST /api/cafe
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "cafeId": "cafe001",
  "password": "cafepassword",
  "cafeName": "커피포임팩트",
  "firebaseRef": "cafes/cafe001"
}
```

#### 카페 수정 (관리자 전용)
```http
PUT /api/cafe/:id
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "cafeName": "새로운 카페명",
  "firebaseRef": "cafes/cafe001"
}
```

#### 카페 비밀번호 변경 (관리자 전용)
```http
PUT /api/cafe/:id/password
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "newPassword": "newpassword123"
}
```

#### 카페 삭제 (관리자 전용)
```http
DELETE /api/cafe/:id
Authorization: Bearer {admin-token}
```

#### 현재 카페 정보 조회
```http
GET /api/cafe/me
Authorization: Bearer {cafe-token}
```

### 기타 API

#### 헬스 체크
```http
GET /health
```

#### 서버 정보
```http
GET /
```

## 데이터베이스

SQLite 데이터베이스를 사용합니다. 데이터베이스 파일은 `database/accounts.db`에 저장됩니다.

### 테이블 구조

#### admins
- `id`: INTEGER PRIMARY KEY
- `username`: TEXT UNIQUE
- `password_hash`: TEXT
- `email`: TEXT
- `created_at`: DATETIME
- `last_login`: DATETIME

#### cafes
- `id`: INTEGER PRIMARY KEY
- `cafe_id`: TEXT UNIQUE
- `password_hash`: TEXT
- `cafe_name`: TEXT
- `firebase_ref`: TEXT
- `created_at`: DATETIME
- `created_by`: INTEGER (FK to admins.id)

## 환경 변수

`.env` 파일에서 설정:

```
PORT=3000
JWT_SECRET=your-secret-key
NODE_ENV=development
```

## 보안 고려사항

1. **JWT_SECRET**: 프로덕션에서는 강력한 랜덤 문자열로 변경
2. **기본 관리자 비밀번호**: 첫 로그인 후 즉시 변경
3. **HTTPS**: 프로덕션에서는 반드시 HTTPS 사용
4. **CORS**: 필요한 origin만 허용하도록 설정

## 트러블슈팅

### 서버가 시작되지 않는 경우
- `node_modules` 폴더 삭제 후 `npm install` 재실행
- 포트 3000이 이미 사용 중인지 확인
- `.env` 파일이 제대로 설정되었는지 확인

### 데이터베이스 초기화
```bash
rm database/accounts.db
npm start  # 자동으로 새 DB 생성
```
