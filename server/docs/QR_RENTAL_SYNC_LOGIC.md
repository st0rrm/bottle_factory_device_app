# QR 대여/반납 → PostgreSQL 동기화 로직

## 개요

Firebase `rents` 컬렉션의 QR 대여/반납 데이터를 PostgreSQL로 실시간 동기화하여 통계 및 `active_rentals` 관리

---

## 전체 프로세스

### 1️⃣ 서버 시작 시

```javascript
startRealtimeListener()
  ↓
syncExistingRentals()  // 기존 대여 중인 문서 일괄 처리
  ↓
실시간 리스너 시작     // 이후 발생하는 모든 변경사항 감지
```

---

## 상세 로직

### 1. `syncExistingRentals()` - 기존 대여 동기화

**목적**: 서버 시작 전에 발생한 QR 대여 중 아직 동기화되지 않은 것들을 일괄 처리

**Firebase 쿼리**:
```javascript
db.collection('rents')
  .where('status', '==', 'rent')      // 현재 대여 중인 것만
  .where('source', '!=', 'web')       // QR 대여만 (웹 제외)
  .orderBy('source')
  .orderBy('rented_date', 'desc')
  .limit(100)
```

**처리 로직**:
```javascript
for (const doc of query.docs) {
  if (!doc.data().pg_synced) {
    // Firebase users/{uid} → mobile 조회
    // Firebase shops/{shop_id} → name 조회
    // PostgreSQL cafes → id 조회

    // PostgreSQL에 저장:
    // 1. transactions 테이블: borrow 트랜잭션 추가
    // 2. active_rentals 테이블: 대여 현황 추가

    // Firebase 플래그 설정: pg_synced = true
  }
}
```

**왜 status='return'은 처리 안 함?**
- 이미 반납 완료된 과거 데이터 (히스토리)
- 현재 `active_rentals`에 영향 없음
- 지금부터 발생하는 반납은 실시간 리스너가 처리

---

### 2. `startRealtimeListener()` - 실시간 감시

**목적**: Firebase 문서 변경사항을 실시간으로 감지하여 PostgreSQL에 동기화

**Firebase 쿼리**:
```javascript
db.collection('rents')
  .where('status', 'in', ['rent', 'return'])  // rent 또는 return
  .where('source', '!=', 'web')               // QR만
  .orderBy('source')
  .orderBy('rented_date', 'desc')
  .onSnapshot()
```

**왜 'rent'와 'return' 둘 다 감시?**
- `rent`: 새로운 QR 대여 감지 (added 이벤트)
- `return`: 기존 대여 문서의 반납 업데이트 감지 (modified 이벤트)

**이벤트 처리**:

#### **added 이벤트** (새 대여)
```javascript
{
  type: 'added',
  status: 'rent',
  pg_synced: false
}
→ borrow 트랜잭션 + active_rentals 추가
→ pg_synced = true
```

#### **modified 이벤트** (반납)
```javascript
{
  type: 'modified',
  status: 'return',        // rent → return으로 변경됨
  pg_synced: true,         // 대여는 이미 동기화됨
  pg_return_synced: false  // 반납은 아직
}
→ return 트랜잭션 + active_rentals 제거
→ pg_return_synced = true
```

---

### 3. `syncSingleRental()` - 단일 문서 동기화

**입력**:
- `docId`: Firebase 문서 ID
- `data`: Firebase 문서 데이터
- `isReturnUpdate`: 반납 업데이트 여부 (기본값: false)

**처리 과정**:

```
1. 중복 체크
   syncingDocs.has(docId)? → return (이미 처리 중)

2. 필터링
   source === 'web'? → return (웹 대여 제외)

3. 동기화 필요 여부 체크
   - 대여 (isReturnUpdate=false): !pg_synced
   - 반납 (isReturnUpdate=true): !pg_return_synced

4. Firebase 데이터 조회
   users/{uid} → mobile (전화번호)
   shops/{shop_id} → name (가게명)

5. 전화번호 마스킹
   "01012345678" → "010-0000-5678"

6. PostgreSQL 조회
   cafes 테이블에서 cafe_name으로 id 찾기

7. PostgreSQL 저장
   Statistics.addTransaction(
     cafeId,
     transactionType,  // 'borrow' or 'return'
     maskedPhone,      // 마스킹된 전화번호
     1,                // 수량
     0,                // 점수 (QR은 0점)
     false,            // 신규 유저 여부
     'qr'              // 출처
   )

   내부적으로:
   - transactions 테이블에 기록 추가
   - active_rentals 테이블 업데이트
     * borrow: 행 추가 또는 수량 증가
     * return: 행 삭제 또는 수량 감소

8. Firebase 플래그 설정
   pg_synced = true
   pg_return_synced = true (반납인 경우)
```

---

## 데이터 변환 과정

### Firebase → PostgreSQL 매핑

```javascript
// Firebase rents 문서
{
  uid: "firebase_user_id",
  rented_shop_id: "firebase_shop_id",
  status: "rent" | "return",
  source: "qr"
}

// ↓ 조회 및 변환

// Firebase users/{uid}
{
  mobile: "01012345678"
}
→ 마스킹: "010-0000-5678"

// Firebase shops/{shop_id}
{
  name: "테스트 카페"
}

// PostgreSQL cafes
{
  cafe_name: "테스트 카페"
  → id: 5
}

// ↓ 최종 저장

// PostgreSQL transactions
{
  cafe_id: 5,
  transaction_type: "borrow",
  phone_number: "010-0000-5678",
  quantity: 1,
  score: 0,
  source: "qr"
}

// PostgreSQL active_rentals
{
  cafe_id: 5,
  phone_number: "010-0000-5678",
  quantity: 1,
  rental_date: now(),
  expected_return_date: now() + 14일
}
```

---

## 중복 방지 메커니즘

### 플래그 시스템

| 플래그 | 의미 | 설정 시점 |
|-------|------|----------|
| `pg_synced` | 대여가 PostgreSQL에 동기화됨 | QR 대여 처리 후 |
| `pg_return_synced` | 반납이 PostgreSQL에 동기화됨 | QR 반납 처리 후 |

### 왜 2개의 플래그?

하나의 Firebase 문서가 **대여 → 반납** 두 단계를 거치므로:

```javascript
// 대여 시
{
  status: "rent",
  pg_synced: true  ✅
}

// 반납 시 (같은 문서 업데이트)
{
  status: "return",
  pg_synced: true,         ✅ 대여는 이미 처리됨
  pg_return_synced: true   ✅ 반납도 처리됨
}
```

서버 재시작 시:
- `pg_synced=true` → 대여 동기화 스킵
- `pg_return_synced=true` → 반납 동기화 스킵

### 동시 처리 방지

```javascript
const syncingDocs = new Set();  // 현재 처리 중인 문서 ID

syncSingleRental(docId, data) {
  if (syncingDocs.has(docId)) return;  // 이미 처리 중

  syncingDocs.add(docId);
  try {
    // ... 처리
  } finally {
    syncingDocs.delete(docId);
  }
}
```

---

## 시나리오별 동작

### 시나리오 1: 새 QR 대여

```
1. 사용자가 QR 스캔으로 대여
   → Firebase rents 문서 생성 (status='rent')

2. 실시간 리스너 감지 (added 이벤트)
   → !pg_synced = true

3. syncSingleRental() 실행
   → PostgreSQL borrow 트랜잭션 생성
   → active_rentals에 추가
   → pg_synced = true
```

### 시나리오 2: QR로 반납

```
1. 사용자가 QR 스캔으로 반납
   → Firebase rents 문서 업데이트 (status='return')

2. 실시간 리스너 감지 (modified 이벤트)
   → status='return' && !pg_return_synced = true

3. syncSingleRental() 실행
   → PostgreSQL return 트랜잭션 생성
   → active_rentals에서 제거
   → pg_return_synced = true
```

### 시나리오 3: 크로스 반납 (전화번호 → QR)

```
1. 전화번호로 대여
   → PostgreSQL: phone_number="010-0000-5678"
   → active_rentals 추가

2. QR로 반납
   → Firebase uid → users 조회 → mobile="01012345678"
   → 마스킹: "010-0000-5678"
   → active_rentals에서 "010-0000-5678" 찾아서 제거 ✅
```

### 시나리오 4: 기존 대여 중인 문서가 나중에 반납

```
1. 서버 시작 전: 기존 QR 대여 존재
   {
     status: "rent",
     rented_date: "2025-01-01"
   }

2. 서버 시작: syncExistingRentals()
   → PostgreSQL borrow + active_rentals 추가
   → pg_synced = true

3. 실시간 리스너 시작
   → where('status', 'in', ['rent', 'return'])
   → 이 문서도 감시 대상 ✅

4. 나중에 사용자가 반납
   → 문서 업데이트 (status='return')
   → 리스너가 modified 이벤트 감지 ✅
   → PostgreSQL return + active_rentals 제거
```

---

## 에러 처리

### 에러 발생 시

```javascript
try {
  // 동기화 처리
} catch (error) {
  // Firebase에 에러 기록
  await db.collection('rents').doc(docId).update({
    pg_synced: true,           // 플래그는 설정 (무한 재시도 방지)
    pg_sync_error: error.message
  });
}
```

### 리스너 에러 시

```javascript
onSnapshot(
  (snapshot) => { /* ... */ },
  (error) => {
    console.error('리스너 에러:', error);
    // 10초 후 자동 재시작
    setTimeout(() => {
      stopListener();
      startRealtimeListener();
    }, 10000);
  }
);
```

---

## 핵심 포인트

1. **전화번호 통일**: UID가 아닌 마스킹된 전화번호(`010-0000-xxxx`) 사용
   → 웹/QR 대여 간 크로스 반납 가능

2. **이중 플래그**: `pg_synced`(대여), `pg_return_synced`(반납)
   → 하나의 문서가 두 번 처리되는 것 방지

3. **상태 기반 쿼리**: `status='rent'`(기존), `status in ['rent','return']`(리스너)
   → 현재 필요한 것만 효율적으로 처리

4. **에러 내성**: 에러 발생 시에도 플래그 설정
   → 무한 재시도 방지

5. **과거 데이터 무시**: 이미 완료된 반납(`status='return'`)은 처리 안 함
   → 불필요한 처리 제거
