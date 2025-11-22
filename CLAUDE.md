# CLAUDE.md

This file provides guidance to Claude Code when working with the bottle_factory_device_app repository.

## 프로젝트 개요

**bottle_factory_device_app**은 가게 내 키오스크 디바이스에서 리턴미컵(ReturMeCup) 재사용 컵 대여/반납 시스템을 관리하는 웹 애플리케이션입니다. bottleclub 모바일 앱의 일부 기능을 웹 디바이스에서 제공하며, bottleclub-tree를 수정한 **bottler_tree_app**을 iframe으로 통합하여 3D 보틀 나무 시각화를 제공합니다.

### 기술 스택
- **Frontend**: React 19.1.1 + Vite 7.1.12
- **Routing**: React Router DOM 7.9.4
- **Authentication**: Firebase Authentication (SMS 인증)
- **Database**:
  - Firebase Firestore (사용자 데이터, 대여/반납 기록, 가게 정보)
  - PostgreSQL on Render (가게 통계 데이터)
- **3D Visualization**: bottler_tree_app (iframe 통합)
- **Backend**: Node.js + Express (Firebase Admin SDK)

---

## 디렉토리 구조

```
bottle_factory_device_app/
├── project1/                          # Frontend (React + Vite)
│   ├── src/
│   │   ├── api/                       # API 통신 계층
│   │   │   ├── auth.js                # 로그인/로그아웃
│   │   │   ├── axios.js               # JWT 포함 Axios 인스턴스
│   │   │   ├── cafe.js                # 가게 관리
│   │   │   └── statistics.js         # 통계 API
│   │   ├── components/                # React 컴포넌트 (30+ 파일)
│   │   │   ├── ReturnModal.jsx       # 컵 반납 모달
│   │   │   ├── VerifyModal.jsx       # 컵 대여 모달
│   │   │   ├── DoModal.jsx           # 제로웨이스트 실천 모달
│   │   │   └── TreeContainer.jsx     # 3D 나무 iframe 래퍼
│   │   ├── firebase/                  # Firebase 통합
│   │   │   ├── config.js              # Firebase 초기화
│   │   │   ├── auth.js                # SMS 인증
│   │   │   └── firestore.js           # Firestore 작업
│   │   ├── pages/                     # 페이지 컴포넌트
│   │   │   ├── home/                  # 메인 키오스크 화면
│   │   │   ├── admin/                 # 관리자 대시보드
│   │   │   ├── cafe/                  # 가게 통계
│   │   │   └── login/                 # 가게 로그인
│   │   ├── hooks/
│   │   │   └── usePicovoice.js       # 음성 웨이크워드 감지
│   │   ├── contexts/
│   │   │   └── BackgroundContext.jsx # 배경 이미지 관리
│   │   └── config/
│   │       └── device.js              # 디바이스/가게 설정
│   └── public/                        # 정적 에셋
│
├── server/                            # Backend API (Node.js + Express)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js                # 로그인 엔드포인트
│   │   │   ├── cafe.js                # 가게 CRUD
│   │   │   ├── statistics.js         # 통계 엔드포인트
│   │   │   └── users.js               # Firebase 사용자 작업
│   │   ├── models/
│   │   │   ├── Cafe.js                # 가게 모델 (PostgreSQL)
│   │   │   └── Statistics.js         # 통계 모델
│   │   ├── config/
│   │   │   ├── database.js            # PostgreSQL 연결
│   │   │   └── firebase.js            # Firebase Admin SDK
│   │   └── middleware/
│   │       └── auth.js                # JWT 인증
│   └── database/
│       └── init.sql                   # PostgreSQL 스키마
│
└── scripts/                           # 유틸리티 스크립트
    ├── migrate-firebase-data.js       # Firebase 데이터 마이그레이션
    └── verify-return.js               # 반납 프로세스 테스트
```

---

## 1. 리턴미컵 관리 기능 (핵심 기능)

### 1.1 컵 반납 (Return Cups)

**주요 파일**: `/project1/src/components/ReturnModal.jsx`
**Firebase 작업**: `/project1/src/firebase/firestore.js` (processReturn 함수)
**Backend API**: `/server/src/routes/users.js:POST /return`

#### 반납 플로우

1. **사용자 인증** (ReturnModal.jsx:80-150)
   - 전화번호 입력 (11자리)
   - Firebase SMS 인증 (6자리 코드)
   - 180초 타임아웃, 최대 5회 시도

2. **반납 가능한 대여 기록 조회** (firestore.js:167-215)
   ```javascript
   // rents 컬렉션에서 조회
   where('uid', '==', userId)
   where('status', '==', 'rent')
   where('rented_shop_id', '==', shopId)  // division이 'individual'인 경우
   // division이 'group'인 경우 같은 클러스터 내 모든 가게에서 반납 가능
   ```

3. **반납 수량 선택** (ReturnModal.jsx:200-280)
   - 사용자가 반납할 컵 개수 선택 (1-10개)
   - 선택 후 "반납하기" 버튼 클릭

4. **반납 처리** (firestore.js:217-312, users.js:215-340)

   **Firebase 업데이트**:
   ```javascript
   // 1. rents 컬렉션 업데이트
   {
     status: 'rent' → 'return',
     returned_date: serverTimestamp(),
     returned_shop_id: shopId,
     returned_shop: shopName
   }

   // 2. balances 컬렉션 복원
   {
     status: 'rent' → 'charge'  // 이용권 재사용 가능하게 변경
   }

   // 3. users 문서 업데이트 (컵 1개당)
   {
     score: +30,
     coin: +300,
     saving_all: +1
   }

   // 4. collect_history 문서 생성
   {
     uid: userId,
     shop_id: shopId,
     score: 30 * quantity,
     create: serverTimestamp()
   }

   // 5. 통계 서브컬렉션 업데이트
   // - users/{uid}/savings
   // - shops/{shopId}/savings
   // - 전역 savings 컬렉션
   ```

   **PostgreSQL 기록** (statistics.js:40-80):
   ```sql
   INSERT INTO transactions (
     cafe_id,
     transaction_type,
     phone_number,
     quantity
   ) VALUES (?, 'return', ?, ?);
   ```

5. **결과 표시 및 나무 성장** (ReturnModal.jsx:300-350)
   - 성공 메시지 표시 (획득한 포인트/코인)
   - TreeContainer로 성장 이벤트 전송 (postMessage)
   - 통계 데이터 갱신

#### 관련 파일 및 위치

- **Frontend**:
  - `/project1/src/components/ReturnModal.jsx:1-450` - 반납 모달 UI
  - `/project1/src/firebase/auth.js:50-120` - SMS 인증 로직
  - `/project1/src/firebase/firestore.js:167-312` - Firestore 반납 처리
  - `/project1/src/api/statistics.js:30-50` - 통계 API 호출

- **Backend**:
  - `/server/src/routes/users.js:215-340` - 반납 엔드포인트
  - `/server/src/routes/statistics.js:40-80` - 통계 기록
  - `/server/src/models/Statistics.js:85-150` - 통계 쿼리

### 1.2 컵 대여 (Rent Cups)

**주요 파일**: `/project1/src/components/VerifyModal.jsx`
**Firebase 작업**: `/project1/src/firebase/firestore.js` (processRental 함수)

#### 대여 플로우

1. **사용자 인증** (VerifyModal.jsx:80-140)
   - 전화번호 + SMS 인증 (반납과 동일)

2. **이용권 확인** (firestore.js:80-110)
   ```javascript
   // balances 컬렉션 조회
   where('user_id', '==', userId)
   where('status', '==', 'charge')  // 사용 가능한 이용권
   where('expired', '>', Date.now())  // 유효기간 내
   ```

3. **신규 사용자 처리** (firestore.js:45-78)
   - 이용권이 없으면 자동으로 무료 이용권 1개 발급
   ```javascript
   {
     user_id: userId,
     status: 'charge',
     pgcode: 'bottleclub',
     amount: 4000,
     expired: Date.now() + (365 * 24 * 60 * 60 * 1000),  // 1년
     tid: 'free_voucher_' + timestamp,
     transaction_date: new Date().toISOString()
   }
   ```

4. **대여 수량 선택** (VerifyModal.jsx:180-250)
   - 보유 이용권 개수만큼 선택 가능 (최대 10개)

5. **대여 처리** (firestore.js:112-165)
   ```javascript
   // 1. balances 컬렉션 업데이트
   {
     status: 'charge' → 'rent'
   }

   // 2. rents 컬렉션에 새 문서 생성
   {
     uid: userId,
     rented_date: serverTimestamp(),
     expired_date: new Date(Date.now() + 14일),
     rented_shop_id: shopId,
     rented_shop: shopName,
     status: 'rent',
     balance_id: balanceId,
     division: shopDivision  // 'individual' or 'group'
   }

   // 3. users 문서 업데이트
   {
     bottle_all: +quantity,
     saving_all: +quantity
   }
   ```

6. **PostgreSQL 기록** (statistics.js:40-80)
   ```sql
   INSERT INTO transactions (
     cafe_id,
     transaction_type,
     phone_number,
     quantity
   ) VALUES (?, 'borrow', ?, ?);
   ```

#### 관련 파일 및 위치

- **Frontend**:
  - `/project1/src/components/VerifyModal.jsx:1-400` - 대여 모달 UI
  - `/project1/src/firebase/firestore.js:45-165` - Firestore 대여 처리
  - `/project1/src/firebase/firestore.js:45-78` - 신규 사용자 이용권 발급

- **Backend**:
  - `/server/src/routes/users.js:120-213` - 대여 엔드포인트
  - `/server/src/routes/statistics.js:40-80` - 통계 기록

### 1.3 제로웨이스트 실천 기록

**주요 파일**: `/project1/src/components/DoModal.jsx`
**Backend API**: `/server/src/routes/statistics.js:POST /transaction`

#### 실천 플로우

1. **사용자 인증** (DoModal.jsx:60-110)
   - 전화번호 + SMS 인증

2. **실천 항목 선택** (DoModal.jsx:130-200)
   - 물병 리필하기
   - 용기 가져오기
   - 분리배출하기
   - 리턴미컵 사용하기
   - 최대 5개 선택 가능

3. **실천 기록** (DoModal.jsx:220-280)
   - PostgreSQL에만 기록 (Firebase에는 기록 안함)
   - 항목당 10포인트 (통계용)
   ```sql
   INSERT INTO transactions (
     cafe_id,
     transaction_type,
     phone_number,
     quantity
   ) VALUES (?, 'do', ?, ?);
   ```

#### 관련 파일 및 위치

- **Frontend**:
  - `/project1/src/components/DoModal.jsx:1-350` - 제로웨이스트 모달 UI
  - `/project1/src/api/statistics.js:30-50` - 통계 API 호출

- **Backend**:
  - `/server/src/routes/statistics.js:40-80` - 실천 기록 엔드포인트

---

## 2. 보틀 나무 표시 기능

### 2.1 나무 시각화 개요

**주요 파일**: `/project1/src/components/TreeContainer.jsx`
**3D 렌더링 앱**: bottler_tree_app (별도 리포지토리, Next.js + React Three Fiber)

#### 통합 방식

```javascript
// TreeContainer.jsx에서 iframe으로 통합
<iframe
  src={`${import.meta.env.VITE_TREE_URL}?uid=${cafeId}`}
  style={{ width: '100%', height: '100%', border: 'none' }}
  ref={iframeRef}
/>

// postMessage API로 통신
iframeRef.current?.contentWindow?.postMessage(
  JSON.stringify({
    type: 'init' | 'grow',
    uid: cafeId,
    total: totalScore,
    count: totalCount,
    score: 30,
    force: true
  }),
  '*'
);
```

### 2.2 나무 성장 시스템

#### 데이터 소스 (Render DB)

**API**: `/server/src/routes/statistics.js:GET /my-stats`
**파일**: `/server/src/models/Statistics.js:85-150`

```sql
-- 총 포인트 계산 (transaction_type='return'인 경우만)
SELECT
  SUM(quantity * 30) as totalScore,
  SUM(quantity) as totalCount,
  COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as weekly
FROM transactions
WHERE cafe_id = ? AND transaction_type = 'return';
```

#### 성장 규칙 (bottler_tree_app)

**나무 구조**:
- **가지 수**: `totalCount` (반납 이벤트 횟수)에 비례
  - 1-5개: 작은 나무
  - 6-20개: 중간 나무
  - 21+개: 큰 나무

- **꽃/열매**: `totalScore`에 따라 해금
  - 30점: 첫 꽃 (분홍색)
  - 100점: 작은 열매 (노란색)
  - 300점: 중간 열매 (주황색)
  - 500점: 큰 열매 (빨간색)
  - 1000+점: 황금 열매

- **배경**: `totalScore`에 따라 변화
  - 0-100: 회색 배경
  - 101-300: 파란 하늘
  - 301-500: 일몰
  - 501+: 밤하늘 (별)

#### 성장 트리거

1. **초기화** (TreeContainer.jsx:40-70)
   - 컴포넌트 마운트 시 'init' 메시지 전송
   - 가게의 누적 통계 로드

2. **실시간 성장** (ReturnModal.jsx:330-350)
   - 컵 반납 성공 시 'grow' 메시지 전송
   - 나무에 새 가지/꽃 추가

```javascript
// 반납 후 나무 성장
const growTree = () => {
  const message = {
    type: 'grow',
    uid: cafeId,
    total: updatedTotalScore,
    count: updatedTotalCount,
    score: 30 * quantity,  // 이번 반납으로 얻은 포인트
    force: true
  };

  window.parent.postMessage(JSON.stringify(message), '*');
};
```

### 2.3 나무 렌더링 (bottler_tree_app)

**기술**: L-System 알고리즘 + Three.js
**파일** (bottler_tree_app 리포지토리):
- `/src/components/Tree3D.jsx` - 3D 나무 컴포넌트
- `/src/utils/lsystem.js` - L-System 생성 로직
- `/src/store/treeStore.js` - Zustand 상태 관리

#### L-System 규칙 예시

```
Axiom: F
Rules:
  F → F[+F]F[-F][F]

매개변수:
- angle: 25도 (가지 각도)
- iterations: totalCount / 5 (반복 횟수)
- length: 기본 20 + (totalScore / 50)
```

#### 관련 파일 및 위치

- **Frontend (bottle_factory_device_app)**:
  - `/project1/src/components/TreeContainer.jsx:1-150` - iframe 래퍼
  - `/project1/src/api/statistics.js:15-28` - 통계 조회
  - `/project1/src/pages/home/home.jsx:80-120` - 나무 컨테이너 렌더링

- **Backend**:
  - `/server/src/routes/statistics.js:85-120` - 통계 API
  - `/server/src/models/Statistics.js:85-150` - 통계 쿼리

- **3D App (bottler_tree_app, 별도 리포지토리)**:
  - `/src/components/Tree3D.jsx` - 3D 렌더링
  - `/src/utils/lsystem.js` - 나무 생성
  - `/src/store/treeStore.js` - 상태 관리

---

## 3. 데이터베이스 구조 및 상호작용

### 3.1 Firebase Firestore (사용자 중심 데이터)

**설정 파일**: `/project1/src/firebase/config.js`
**작업 파일**: `/project1/src/firebase/firestore.js`

#### 주요 컬렉션

##### 1. `users` - 사용자 정보

**위치**: Firestore 루트
**문서 ID**: Firebase Auth UID

```javascript
{
  uid: string,              // Firebase Auth UID
  mobile: string,           // 전화번호 (01012345678)
  name: string,             // 닉네임 (전화번호 뒤 7자리)
  score: number,            // 보틀 포인트 (반납 1개당 +30)
  coin: number,             // 코인 (포인트 * 10)
  saving_all: number,       // 총 반납 횟수
  bottle_all: number,       // 총 대여 횟수
  address: object,          // 카카오 맵 주소 데이터
  adm_cd2: string,          // 행정구역 코드
  create: timestamp,
  update: timestamp
}
```

**생성**: `firestore.js:createNewUser()`
**업데이트**: `firestore.js:processReturn()` (반납 시 score/coin/saving_all 증가)

##### 2. `balances` - 대여 이용권

**위치**: Firestore 루트
**문서 ID**: 자동 생성

```javascript
{
  user_id: string,          // 사용자 UID
  status: string,           // 'charge' (사용가능) | 'rent' (사용중)
  pgcode: string,           // 'bottleclub' (무료) | 결제 코드
  amount: number,           // 이용권 금액 (4000원)
  expired: number,          // 만료 타임스탬프
  tid: string,              // 거래 ID
  transaction_date: string  // 발급일시 (YYYY-MM-DD HH:MM:SS)
}
```

**쿼리**:
- 사용 가능한 이용권: `where('status', '==', 'charge')`
- 사용 중인 이용권: `where('status', '==', 'rent')`

**생성**: `firestore.js:createNewUser()` (신규 사용자 무료 이용권 발급)
**업데이트**:
- 대여 시: `status: 'charge' → 'rent'` (processRental)
- 반납 시: `status: 'rent' → 'charge'` (processReturn)

##### 3. `rents` - 대여/반납 기록

**위치**: Firestore 루트
**문서 ID**: 자동 생성

```javascript
{
  uid: string,              // 사용자 UID
  rented_date: timestamp,   // 대여 일시
  expired_date: date,       // 반납 기한 (14일)
  rented_shop_id: string,   // 대여 가게 ID
  rented_shop: string,      // 대여 가게 이름
  status: string,           // 'rent' | 'return' | 'lost'
  balance_id: string,       // 연결된 이용권 ID
  division: string,         // 'individual' | 'group'

  // 반납 시 추가되는 필드
  returned_date: timestamp, // 반납 일시
  returned_shop_id: string, // 반납 가게 ID
  returned_shop: string     // 반납 가게 이름
}
```

**쿼리**:
- 반납 가능한 대여:
  ```javascript
  where('uid', '==', userId)
  where('status', '==', 'rent')
  where('rented_shop_id', '==', shopId)  // division='individual'
  ```

**생성**: `firestore.js:processRental()`
**업데이트**: `firestore.js:processReturn()` (status 변경 + 반납 정보 추가)

##### 4. `collect_history` - 반납 이력

**위치**: Firestore 루트
**문서 ID**: 자동 생성

```javascript
{
  uid: string,              // 사용자 UID
  shop_id: string,          // 반납 가게 ID
  score: number,            // 획득 포인트 (30 * 개수)
  create: timestamp
}
```

**생성**: `firestore.js:processReturn()` (반납 시마다 생성)

##### 5. `shops` - 가게 정보

**위치**: Firestore 루트
**문서 ID**: 가게 ID

```javascript
{
  name: string,             // 가게 이름 (cafeName과 매칭)
  division: string,         // 'individual' | 'group'
  pin: string,              // 4자리 PIN (로그인용)
  create: timestamp,
  update: timestamp
}
```

**division 설명**:
- `individual`: 같은 가게에서만 반납 가능
- `group`: 같은 클러스터 내 모든 가게에서 반납 가능

**쿼리**: `firestore.js:getShopByName()`

#### 서브컬렉션

- `users/{uid}/collect` - collect_history 참조
- `users/{uid}/savings` - 사용자별 월별 통계
- `shops/{shopId}/savings` - 가게별 월별 통계
- 전역 `savings` - 전체 시스템 통계

### 3.2 PostgreSQL (가게 통계 데이터)

**설정 파일**: `/server/src/config/database.js`
**스키마**: `/server/database/init.sql`

#### 테이블 구조

##### 1. `cafes` - 가게 등록

```sql
CREATE TABLE cafes (
  id SERIAL PRIMARY KEY,
  cafe_id VARCHAR(100) UNIQUE NOT NULL,  -- 가게 고유 ID
  cafe_name VARCHAR(255) NOT NULL,       -- 가게 이름
  pin VARCHAR(4) NOT NULL,               -- 로그인 PIN
  created_at TIMESTAMP DEFAULT NOW()
);
```

**파일**: `/server/src/models/Cafe.js`
**API**: `/server/src/routes/cafe.js`

##### 2. `transactions` - 거래 기록

```sql
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  cafe_id INTEGER REFERENCES cafes(id),
  transaction_type VARCHAR(10) NOT NULL,  -- 'borrow' | 'return' | 'do'
  phone_number VARCHAR(20),
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**인덱스**:
```sql
CREATE INDEX idx_transactions_cafe ON transactions(cafe_id);
CREATE INDEX idx_transactions_date ON transactions(created_at);
CREATE INDEX idx_transactions_type ON transactions(transaction_type);
```

**파일**: `/server/src/models/Statistics.js`
**API**: `/server/src/routes/statistics.js`

##### 3. `user_behaviors` - 사용자 행동 추적

```sql
CREATE TABLE user_behaviors (
  id SERIAL PRIMARY KEY,
  cafe_id INTEGER REFERENCES cafes(id),
  behavior_type VARCHAR(50) NOT NULL,    -- 'modal_open', 'tab_switch' 등
  behavior_value VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**파일**: `/server/src/routes/statistics.js:POST /behavior`
**사용**: 키오스크 UI 인터랙션 분석

#### 통계 계산 쿼리

**파일**: `/server/src/models/Statistics.js:getCafeStats()`

```sql
SELECT
  -- 총 포인트 (반납만 카운트)
  COALESCE(SUM(
    CASE WHEN transaction_type = 'return' THEN quantity * 30 ELSE 0 END
  ), 0) as total_score,

  -- 총 반납 횟수
  COALESCE(SUM(
    CASE WHEN transaction_type = 'return' THEN quantity ELSE 0 END
  ), 0) as total_count,

  -- 오늘 반납
  COALESCE(COUNT(*) FILTER (
    WHERE DATE(created_at) = CURRENT_DATE
    AND transaction_type = 'return'
  ), 0) as today,

  -- 최근 7일 반납
  COALESCE(COUNT(*) FILTER (
    WHERE created_at > NOW() - INTERVAL '7 days'
    AND transaction_type = 'return'
  ), 0) as weekly

FROM transactions
WHERE cafe_id = $1;
```

### 3.3 데이터베이스 사용 패턴

| **데이터 유형**               | **데이터베이스**        | **이유**                                      |
|-----------------------------|---------------------|----------------------------------------------|
| 사용자 계정                   | Firebase Firestore  | 실시간 동기화, 인증 통합, 모바일 앱 호환성              |
| 대여 이용권 (balances)        | Firebase Firestore  | 사용자 소유 데이터, 복잡한 쿼리, 트랜잭션              |
| 대여/반납 기록 (rents)        | Firebase Firestore  | 거래 이력, 사용자 연결, 모바일 앱과 동기화              |
| 가게 통계 (집계)              | PostgreSQL          | 빠른 집계, 관계형 쿼리, 리포팅                       |
| 거래 로그                     | PostgreSQL          | 시계열 데이터, 분석, 대량 데이터 처리                 |
| 사용자 행동 추적              | PostgreSQL          | 익명 추적, 분석, 개인정보 비식별화                    |
| 가게 로그인 인증              | PostgreSQL          | JWT 기반 인증, Firebase와 분리                    |

#### 동기화 전략

**반납 프로세스 예시**:
```
사용자가 컵 2개 반납
    ↓
[1] Firebase 업데이트 (firestore.js:processReturn)
    - rents: status='rent' → 'return'
    - balances: status='rent' → 'charge'
    - users: score +60, coin +600
    - collect_history: 새 문서 생성
    ↓
[2] Backend API 호출 (users.js:POST /return)
    - Firebase Admin SDK로 검증
    ↓
[3] PostgreSQL 기록 (statistics.js:addTransaction)
    - INSERT INTO transactions (type='return', quantity=2)
    ↓
[4] Frontend 통계 갱신
    - GET /api/statistics/my-stats
    - totalScore +60, totalCount +2
    ↓
[5] 나무 성장 (TreeContainer)
    - postMessage('grow', { score: 60, count: 2 })
```

**장점**:
1. Firebase: 사용자 중심 실시간 데이터, 오프라인 지원
2. PostgreSQL: 빠른 통계 집계, 효율적인 리포팅
3. 두 DB 모두 실패 시 독립적으로 복구 가능

---

## 4. 기타 구현 기능

### 4.1 음성 웨이크워드 감지

**파일**: `/project1/src/hooks/usePicovoice.js`
**라이브러리**: Picovoice SDK (WASM)

#### 웨이크워드

- "포장" (pojang_ko.ppn)
- "테이크아웃" (takeout_ko.ppn)

#### 동작

```javascript
// 웨이크워드 감지 시
const keywordDetectionCallback = (keywordIndex) => {
  console.log(`Wake word detected: ${keywords[keywordIndex]}`);
  // 도움말 모달 열기
  setIsHelpModalOpen(true);
};
```

**사용 위치**: `/project1/src/pages/home/home.jsx:45-60`

### 4.2 관리자 대시보드

**파일**: `/project1/src/pages/admin/AdminDashboard.jsx`
**인증**: JWT 토큰 (localStorage)

#### 기능

1. **전체 가게 통계 조회**
   - API: `GET /api/statistics/all-cafes`
   - 각 가게별 totalScore, totalCount, today, weekly 표시

2. **거래 내역 Excel 내보내기**
   - API: `GET /api/statistics/history/:cafeId`
   - XLSX 라이브러리로 엑셀 파일 생성
   - 파일명: `{cafeName}_transactions_{날짜}.xlsx`

3. **가게 관리**
   - 생성: `POST /api/cafe/register`
   - 수정: `PUT /api/cafe/:id`
   - 삭제: `DELETE /api/cafe/:id`

4. **통계 초기화**
   - API: `DELETE /api/statistics/reset`
   - 모든 거래 기록 삭제 (주의: 복구 불가)

**관련 파일**:
- `/server/src/routes/cafe.js` - 가게 CRUD
- `/server/src/routes/statistics.js:122-180` - 통계 API
- `/server/src/models/Statistics.js:200-250` - 통계 모델

### 4.3 배경 이미지 관리

**파일**: `/project1/src/contexts/BackgroundContext.jsx`

#### 기능

- 여러 배경 이미지 중 사용자가 선택 가능 (bg1, bg2, bg3 등)
- 선택한 배경을 localStorage에 저장하여 재접속 시에도 유지
- 배경 오브젝트 (bg_objects.png) 표시/숨김 토글 기능
- Vite의 import.meta.glob으로 배경 이미지 자동 감지 및 로드

**저장 방식**:
- localStorage 키: `tree_background_id` (선택한 배경 ID)
- localStorage 키: `tree_show_objects` (오브젝트 표시 여부)

**이미지 경로**: `/project1/src/assets/images/backgrounds/`
**사용 위치**: 설정 화면 등에서 배경 선택 UI에 사용

### 4.4 가게 로그인 시스템

**파일**:
- Frontend: `/project1/src/pages/login/Login.jsx`
- Backend: `/server/src/routes/auth.js`

#### 로그인 플로우

1. **입력**: 가게 ID + PIN (4자리)
2. **검증**: PostgreSQL cafes 테이블 조회
3. **JWT 발급**:
   ```javascript
   {
     id: cafe.id,
     cafeId: cafe.cafe_id,
     role: 'cafe',
     cafeName: cafe.cafe_name
   }
   ```
4. **저장**: localStorage에 JWT 토큰 + 가게 정보 저장
5. **리다이렉트**: 메인 홈 화면으로 이동

**관련 파일**:
- `/project1/src/api/auth.js` - 로그인/로그아웃 API
- `/server/src/middleware/auth.js` - JWT 인증 미들웨어
- `/project1/src/config/device.js:getShopId()` - 로컬스토리지에서 가게 ID 읽기

### 4.5 SMS 인증 시스템

**파일**: `/project1/src/firebase/auth.js`

#### 인증 플로우

1. **reCAPTCHA 초기화**
   ```javascript
   const appVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
     size: 'invisible',
     callback: (response) => {
       // reCAPTCHA 통과
     }
   });
   ```

2. **인증 코드 전송**
   ```javascript
   const confirmationResult = await signInWithPhoneNumber(
     auth,
     phoneNumber,  // +82 1012345678
     appVerifier
   );
   ```

3. **코드 확인**
   ```javascript
   const result = await confirmationResult.confirm(verificationCode);
   const user = result.user;  // Firebase User 객체
   ```

4. **타임아웃 및 재시도**
   - 180초 타임아웃
   - 최대 5회 시도
   - 실패 시 appVerifier 재생성

**사용 위치**:
- `/project1/src/components/ReturnModal.jsx:80-150`
- `/project1/src/components/VerifyModal.jsx:80-140`
- `/project1/src/components/DoModal.jsx:60-110`

---

## 5. 전반적인 아키텍처

### 5.1 시스템 구성도

```
┌─────────────────────────────────────────────────────────────┐
│                    Kiosk Device (Browser)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │      bottle_factory_device_app (React + Vite)       │    │
│  │                                                       │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │    │
│  │  │ ReturnModal  │  │ VerifyModal  │  │  DoModal  │ │    │
│  │  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │    │
│  │         │                 │                 │       │    │
│  │         └─────────────────┴─────────────────┘       │    │
│  │                           ↓                          │    │
│  │              ┌─────────────────────────┐             │    │
│  │              │   Firebase Auth (SMS)   │             │    │
│  │              └─────────────────────────┘             │    │
│  │                           ↓                          │    │
│  │              ┌─────────────────────────┐             │    │
│  │              │  Firestore Operations   │             │    │
│  │              └─────────────────────────┘             │    │
│  │                                                       │    │
│  │  ┌──────────────────────────────────────────────┐   │    │
│  │  │         TreeContainer (iframe)               │   │    │
│  │  │                                               │   │    │
│  │  │  ┌────────────────────────────────────────┐  │   │    │
│  │  │  │  bottler_tree_app (Next.js + Three.js) │  │   │    │
│  │  │  │                                          │  │   │    │
│  │  │  │  L-System → 3D Tree Rendering           │  │   │    │
│  │  │  └────────────────────────────────────────┘  │   │    │
│  │  └──────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└───────────────────────────┬───────────────────────────────────┘
                            │
                            ↓
        ┌───────────────────────────────────────┐
        │                                       │
┌───────┴──────────┐              ┌─────────────┴──────────┐
│ Firebase (Google)│              │  Render (Backend API)  │
├──────────────────┤              ├────────────────────────┤
│                  │              │                        │
│  Firestore DB    │              │  Node.js + Express     │
│  ├─ users        │              │  ├─ /api/auth         │
│  ├─ balances     │              │  ├─ /api/cafe         │
│  ├─ rents        │              │  ├─ /api/statistics   │
│  ├─ shops        │              │  └─ /api/users        │
│  └─ collect_*    │              │                        │
│                  │              │  PostgreSQL DB         │
│  Firebase Auth   │              │  ├─ cafes             │
│  (SMS 인증)       │              │  ├─ transactions      │
│                  │              │  └─ user_behaviors    │
└──────────────────┘              └────────────────────────┘
```

### 5.2 데이터 흐름 예시

#### 컵 반납 플로우

```
[1] 사용자가 "반납하기" 버튼 클릭
    ↓
[2] ReturnModal 오픈 (ReturnModal.jsx:50)
    ↓
[3] 전화번호 입력 + SMS 인증 (auth.js:sendSMSVerification)
    ↓ Firebase Authentication
[4] 인증 성공 → Firebase User UID 획득
    ↓
[5] 반납 가능한 대여 기록 조회 (firestore.js:getActiveRentals)
    ↓ Firestore Query (rents 컬렉션)
[6] 대여 목록 표시 → 사용자가 수량 선택
    ↓
[7] "반납하기" 확인 버튼 클릭
    ↓
[8] Firestore 업데이트 (firestore.js:processReturn)
    ├─ rents: status 변경
    ├─ balances: 이용권 복원
    ├─ users: score/coin/saving_all 증가
    └─ collect_history: 새 문서 생성
    ↓
[9] Backend API 호출 (users.js:POST /return)
    ↓
[10] PostgreSQL 기록 (statistics.js:addTransaction)
    ↓ INSERT INTO transactions
[11] 성공 응답 → 모달에 결과 표시
    ↓
[12] 통계 갱신 (statistics.js:getCafeStats)
    ↓ SELECT totalScore, totalCount
[13] 나무 성장 트리거 (TreeContainer:postMessage)
    ↓
[14] bottler_tree_app에서 나무 업데이트
    └─ L-System 재계산 → Three.js 렌더링
```

### 5.3 주요 디렉토리 역할

| **디렉토리**                      | **역할**                                      |
|----------------------------------|---------------------------------------------|
| `/project1/src/api/`             | Backend API 통신 (Axios)                     |
| `/project1/src/components/`      | 재사용 가능한 UI 컴포넌트                       |
| `/project1/src/firebase/`        | Firebase SDK 통합 (Auth, Firestore)          |
| `/project1/src/pages/`           | 페이지 레벨 컴포넌트 (라우팅)                    |
| `/project1/src/hooks/`           | 커스텀 React Hooks                           |
| `/project1/src/contexts/`        | React Context API (전역 상태)                 |
| `/project1/src/config/`          | 설정 파일 (device.js)                        |
| `/project1/src/assets/`          | 정적 에셋 (폰트, 이미지)                        |
| `/server/src/routes/`            | Express 라우트 (API 엔드포인트)                 |
| `/server/src/models/`            | 데이터베이스 모델 (PostgreSQL)                  |
| `/server/src/config/`            | Backend 설정 (DB, Firebase Admin)             |
| `/server/src/middleware/`        | Express 미들웨어 (JWT 인증)                    |
| `/server/database/`              | PostgreSQL 스키마 및 마이그레이션                |
| `/scripts/`                      | 유틸리티 스크립트 (마이그레이션, 테스트)           |

---

## 6. bottleclub 모바일 앱과의 관계

### 6.1 공유 생태계

**bottle_factory_device_app**는 bottleclub 모바일 앱의 **키오스크 버전**입니다.

#### 공유 데이터

- **Firebase Collections**: 동일한 `users`, `balances`, `rents`, `shops` 컬렉션 사용
- **사용자 계정**: 전화번호로 동일한 Firebase UID 매핑
- **이용권**: 모바일에서 구매 → 키오스크에서 사용
- **대여/반납 기록**: 모바일에서 대여 → 키오스크에서 반납 (또는 반대)

#### 키오스크 전용 기능

- 음성 웨이크워드 감지
- PostgreSQL 통계 (가게 리포팅)
- 관리자 대시보드
- 나무 시각화 (공용 디스플레이)

#### 모바일 전용 기능 (추정)

- 이용권 구매 (결제 연동)
- 개인 대여/반납 이력 조회
- QR 코드 생성
- 푸시 알림 (반납 기한 등)

### 6.2 데이터 동기화 예시

```
[사용자가 모바일 앱에서 컵 대여]
    ↓
Firebase rents 컬렉션에 문서 생성
    ↓
[사용자가 키오스크에서 컵 반납]
    ↓
키오스크가 Firebase 쿼리
    → 해당 사용자의 active rentals 조회
    ↓
Firebase 업데이트 (status='rent' → 'return')
    ↓
PostgreSQL 기록 (가게 통계용)
    ↓
[모바일 앱 실시간 동기화]
    → 사용자가 앱 열면 업데이트된 balance/score 표시
```

---

## 7. 개발 가이드

### 7.1 로컬 개발 환경 설정

#### 1. Backend 실행

```bash
cd server
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일 편집 (DB 연결 정보, Firebase 키 등)

# PostgreSQL 실행 (Docker)
docker-compose up -d

# 서버 시작
npm run dev  # Port 3000
```

#### 2. Frontend 실행

```bash
cd project1
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일 편집 (Firebase 설정, API URL 등)

# 개발 서버 시작
npm run dev  # Port 5173
```

#### 3. PostgreSQL 스키마 생성

```bash
# PostgreSQL 접속
psql -U returnmecup -d returnmecup_db

# 스키마 실행
\i server/database/init.sql
```

### 7.2 환경 변수

#### Frontend (.env)

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_TREE_URL=https://bottler-tree-app.vercel.app/

# Firebase Config
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Kakao Maps
VITE_KAKAO_API_KEY=your_kakao_key
```

#### Backend (.env)

```env
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=returnmecup_db
DB_USER=returnmecup
DB_PASSWORD=returnmecup2024

# JWT
JWT_SECRET=your_jwt_secret_key_here

# CORS
CORS_ORIGIN=http://localhost:5173

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your_project
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com
```

### 7.3 테스트 계정

#### Admin 계정
- ID: `admin`
- Password: `admin1234`

#### Cafe 계정
- 관리자 대시보드에서 생성

#### 테스트 전화번호
- `01010000001` (개발 모드에서 Firebase 우회)

### 7.4 배포

#### Frontend (Vercel)

```bash
# Vercel CLI 설치
npm i -g vercel

# 프로젝트 루트에서
cd project1
vercel

# 환경 변수 설정 (Vercel Dashboard)
# - VITE_API_BASE_URL
# - VITE_FIREBASE_* (모든 Firebase 설정)
```

#### Backend (Render)

1. GitHub 리포지토리 연결
2. `render.yaml` 자동 감지
3. 환경 변수 설정 (Render Dashboard)
   - DB_HOST (PostgreSQL 서비스에서 자동 주입)
   - JWT_SECRET
   - FIREBASE_* (Admin SDK 설정)

---

## 8. 개발 시 주의사항

### 8.1 Firebase 사용

- **보안 규칙**: `firestore.rules` 파일 확인
- **복합 쿼리**: 인덱스 생성 필요 (Firebase Console)
- **트랜잭션**: Firestore 트랜잭션은 최대 500개 문서만 처리 가능

### 8.2 PostgreSQL 사용

- **인덱스**: transactions 테이블에 cafe_id, created_at 인덱스 필수
- **연결 풀**: pg.Pool 사용으로 연결 재사용
- **타임존**: 서버 타임존을 UTC로 설정

### 8.3 성능 최적화

- **통계 캐싱**: Redis 추가 고려 (현재는 매번 DB 쿼리)
- **Firebase 쿼리**: where 조건 최소화, limit 사용
- **이미지 최적화**: WebP 포맷으로 변환 권장

### 8.4 보안

- **JWT 시크릿**: 프로덕션에서 강력한 랜덤 문자열 사용
- **Firebase Admin Key**: 절대 Frontend에 노출 금지
- **CORS**: 프로덕션에서 도메인 제한
- **SQL Injection**: Prepared Statements 사용 (pg 라이브러리 기본)

---

## 9. 추가 문서

- **DEPLOYMENT.md** - Vercel + Render 배포 가이드
- **RENTAL_RETURN_PROCESS.md** - 대여/반납 프로세스 상세 설명
- **FIREBASE-SETUP-GUIDE.md** - Firebase 프로젝트 설정
- **TEAM-SETUP.md** - 팀 개발 환경 설정
- **POSTGRESQL_MIGRATION.md** - PostgreSQL 마이그레이션 가이드

---

## 10. 문제 해결

### Firebase 인증 실패

```javascript
// appVerifier 재생성
window.recaptchaVerifier?.clear();
window.recaptchaVerifier = new RecaptchaVerifier(auth, ...);
```

### PostgreSQL 연결 오류

```bash
# PostgreSQL 로그 확인
docker logs returnmecup-db

# 연결 테스트
psql -U returnmecup -d returnmecup_db -h localhost
```

### bottler_tree_app iframe 통신 실패

```javascript
// postMessage 디버깅
console.log('Sending message to iframe:', message);
iframe.contentWindow.postMessage(JSON.stringify(message), '*');

// bottler_tree_app에서 수신 확인
window.addEventListener('message', (event) => {
  console.log('Received message:', event.data);
});
```

---

## 개발 명령어 정리

```bash
# Frontend
cd project1
npm install          # 의존성 설치
npm run dev          # 개발 서버 (Port 5173)
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 미리보기
npm run lint         # ESLint 검사

# Backend
cd server
npm install          # 의존성 설치
npm run dev          # 개발 서버 (Port 3000)
npm start            # 프로덕션 서버

# PostgreSQL
docker-compose up -d           # 데이터베이스 시작
docker-compose down            # 데이터베이스 중지
psql -U returnmecup -d returnmecup_db  # DB 접속

# Git
git status
git add .
git commit -m "commit message"
git push
```

---

**문서 작성일**: 2025-11-22
**버전**: 1.0.0
**작성자**: Claude Code
