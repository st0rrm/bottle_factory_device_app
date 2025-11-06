# 📱 전화번호 인증 대여/반납 프로세스 - DB 변화 가이드

> 프로그래밍 코드 없이 데이터베이스 컬렉션과 필드 중심으로 설명합니다.

---

# 🔵 PART 1: 대여 프로세스

---

## Step 1: 전화번호 입력 및 SMS 인증

### 사용자가 하는 일:
1. 웹 화면에서 **"컵 대여"** 버튼 클릭
2. 전화번호 입력: `01012345678`
3. **"인증번호 받기"** 버튼 클릭
4. SMS로 받은 6자리 인증번호 입력
5. **"확인"** 버튼 클릭

### 데이터베이스 변화:
**변화 없음** (Firebase 인증 시스템만 사용)

### 결과:
- 사용자 고유 ID (uid) 생성: `AbCd123XyZ789...`
- 전화번호 인증 완료

---

## Step 2: 사용자 확인 (신규 vs 기존)

### 시스템이 하는 일:
`users` 컬렉션에서 전화번호로 사용자 검색

**검색 조건**:
- 컬렉션: `users`
- 필드: `mobile` = `"01012345678"`

이제 두 가지 경로로 나뉩니다.

---

## 🆕 경로 A: 신규 사용자

### 검색 결과:
사용자 없음 (처음 방문)

---

### Step 2-A: 신규 사용자 생성

#### ✅ DB 변화 ①: `users` 컬렉션에 신규 문서 생성

**컬렉션**: `users`
**문서 ID**: `AbCd123XyZ789...` (자동 생성된 uid)

| 필드명 | 값 | 설명 |
|--------|-----|------|
| `uid` | `"AbCd123XyZ789..."` | 사용자 고유 ID |
| `mobile` | `"01012345678"` | 전화번호 |
| `nickname` | `"01012345678"` | 닉네임 (기본값: 전화번호) |
| `score` | `0` | 보틀점수 |
| `coin` | `0` | 코인 |
| `saving_all` | `0` | 누적 반납 횟수 |
| `create` | `2025-11-06 12:34:56` | 생성 시간 |
| `update` | `2025-11-06 12:34:56` | 수정 시간 |

**결과**: 사용자 정보 1개 생성

---

### Step 2-B: 무료 대여권 지급

#### ✅ DB 변화 ②: `balances` 컬렉션에 신규 문서 생성

**컬렉션**: `balances`
**문서 ID**: (자동 생성)

| 필드명 | 값 | 설명 |
|--------|-----|------|
| `user_id` | `"AbCd123XyZ789..."` | 사용자 ID |
| `status` | `"charge"` | 사용 가능 상태 |
| `pgcode` | `"bottleclub"` | 무료 대여권 식별자 |
| `amount` | `4000` | 대여권 가격 |
| `expired` | `9999999999999` | 만료 없음 |
| `pay_info` | `"보틀클럽"` | 결제 정보 |
| `tid` | `"0_bottleclub_free-20251106123456"` | 거래 ID |
| `transaction_date` | `"2025-11-06 12:34:56"` | 거래 시간 |

**결과**: 무료 대여권 1개 생성

---

### ✅ 신규 사용자 생성 완료 시점:

| 컬렉션 | 문서 개수 | 주요 내용 |
|--------|----------|----------|
| `users` | 1개 생성 | mobile, score=0, coin=0 |
| `balances` | 1개 생성 | status='charge' (무료 대여권) |
| `rents` | 0개 | 아직 대여 안함 |
| `collect_history` | 0개 | 아직 적립 안함 |

---

## ♻️ 경로 B: 기존 사용자

### 검색 결과:
사용자 있음 (이미 가입된 회원)

#### 📊 조회된 데이터 (예시):

**컬렉션**: `users`

| 필드명 | 값 | 설명 |
|--------|-----|------|
| `uid` | `"XyZ789AbC123..."` | 사용자 ID |
| `mobile` | `"01012345678"` | 전화번호 |
| `nickname` | `"홍길동"` | 닉네임 |
| `score` | `150` | 기존 보틀점수 |
| `coin` | `1500` | 기존 코인 |
| `saving_all` | `5` | 기존 누적 반납 횟수 |

**DB 변화**: 없음 (조회만)

**기존 대여권 상태 예시**:
- `balances` 컬렉션에 `status='charge'` 문서 3개 존재

---

## Step 3: 대여권 조회

### 시스템이 하는 일:
`balances` 컬렉션에서 사용 가능한 대여권 검색

**검색 조건**:
- 컬렉션: `balances`
- 필드: `user_id` = 사용자 uid
- 필드: `status` = `"charge"` (사용 가능)

### 조회 결과:
- **신규 사용자**: 1개 (방금 받은 무료 대여권)
- **기존 사용자**: N개 (남은 대여권 개수)

**DB 변화**: 없음 (조회만)

---

## Step 4: 대여 수량 선택

### 사용자가 하는 일:
```
화면 표시: "사용 가능한 대여권: 1개"
사용자 선택: 1개
"확인" 버튼 클릭
```

**DB 변화**: 없음

---

## Step 5: 대여 확인

### 사용자가 하는 일:
```
대여 확인 화면:
  • 대여 개수: 1개
  • 대여일: 2025년 11월 06일
  • 반납 예정일: 2025년 11월 20일 (14일 후)
  • 대여 점수: 30 보틀

"대여하기" 버튼 클릭 (최종 확정)
```

**DB 변화**: 없음 (아직 미확정)

---

## Step 6: 대여 처리 (최종 실행)

### 시스템이 하는 일:

#### 6-1. 만료일 계산
- 현재 날짜: 2025-11-06
- 14일 추가: 2025-11-20

---

#### 6-2. 대여권 상태 변경

#### ✅ DB 변화 ③: `balances` 문서 수정

**컬렉션**: `balances`
**문서 ID**: `balance_abc123`

**변경 전**:
| 필드명 | 값 | 설명 |
|--------|-----|------|
| `user_id` | `"AbCd123XyZ789..."` | 사용자 ID |
| `status` | `"charge"` | 사용 가능 |
| `pgcode` | `"bottleclub"` | 무료 대여권 |

**변경 후**:
| 필드명 | 값 | 변화 |
|--------|-----|------|
| `user_id` | `"AbCd123XyZ789..."` | 변화 없음 |
| `status` | `"rent"` | ✅ **'charge' → 'rent'** (사용 중) |
| `pgcode` | `"bottleclub"` | 변화 없음 |
| `update` | `2025-11-06 12:34:56` | ✅ **추가** |

**의미**: 대여권이 "사용 가능" → "사용 중" 상태로 변경

---

#### 6-3. 대여 기록 생성

#### ✅ DB 변화 ④: `rents` 컬렉션에 신규 문서 생성

**컬렉션**: `rents`
**문서 ID**: `rent_xyz789` (자동 생성)

| 필드명 | 값 | 설명 |
|--------|-----|------|
| `uid` | `"AbCd123XyZ789..."` | 사용자 ID |
| `rented_date` | `2025-11-06 12:34:56` | 대여 시간 |
| `expired_date` | `2025-11-20 12:34:56` | 만료 시간 (14일 후) |
| `rented_shop_id` | `"shop_starbucks_123"` | 대여한 가게 ID |
| `rented_shop` | `"스타벅스 강남점"` | 대여한 가게명 |
| `status` | `"rent"` | 대여 중 |
| `amount` | `1` | 컵 개수 |
| `division` | `"individual"` | 개별 반납 (같은 가게에서만) |
| `balance_id` | `"balance_abc123"` | 사용한 대여권 ID |
| `id` | `"rent_xyz789"` | 자기 자신의 ID |

**의미**: 대여 내역 기록 생성

---

### ✅ 대여 완료 후 최종 DB 상태 (신규 사용자 기준):

| 컬렉션 | 변화 내용 |
|--------|----------|
| `users` | 변화 없음 (score=0, coin=0) |
| `balances` | 1개 수정: `status` = `'charge'` → `'rent'` |
| `rents` | 1개 생성: `status='rent'`, 만료일 14일 후 |

---

### 📌 대여 완료 시점 데이터 구조:

```
users 컬렉션
  └─ uid: AbCd123XyZ789...
       ├─ mobile: 01012345678
       ├─ score: 0
       ├─ coin: 0
       └─ saving_all: 0

balances 컬렉션 (1개)
  └─ 문서 ID: balance_abc123
       ├─ user_id: AbCd123XyZ789...
       └─ status: "rent" ✅ (사용 중)

rents 컬렉션 (1개) ✅ 신규 생성
  └─ 문서 ID: rent_xyz789
       ├─ uid: AbCd123XyZ789...
       ├─ rented_shop_id: shop_starbucks_123
       ├─ expired_date: 2025-11-20
       ├─ status: "rent" (대여 중)
       └─ balance_id: balance_abc123 (연결)
```

---

# 🔴 PART 2: 반납 프로세스

---

## Step 1~2: 전화번호 인증

대여와 동일한 과정
- 전화번호 입력 → SMS 인증 → 인증번호 확인

**DB 변화**: 없음

---

## Step 3: 사용자 확인

### 시스템이 하는 일:
`users` 컬렉션에서 사용자 조회

**조회 결과**:

**컬렉션**: `users`

| 필드명 | 값 | 설명 |
|--------|-----|------|
| `uid` | `"AbCd123XyZ789..."` | 사용자 ID |
| `mobile` | `"01012345678"` | 전화번호 |
| `score` | `0` | 아직 반납 안해서 0점 |
| `coin` | `0` | 0 코인 |
| `saving_all` | `0` | 반납 횟수 0 |

**DB 변화**: 없음 (조회만)

---

## Step 4: 반납 가능한 대여 조회

### 시스템이 하는 일:
`rents` 컬렉션에서 반납 가능한 대여 검색

**검색 조건**:
- 컬렉션: `rents`
- 필드: `uid` = 사용자 uid
- 필드: `status` = `"rent"` (대여 중)
- 정렬: `rented_date` 오래된 순

### 조회 결과:

**컬렉션**: `rents`

| 필드명 | 값 | 설명 |
|--------|-----|------|
| 문서 ID | `rent_xyz789` | 대여 기록 ID |
| `uid` | `"AbCd123XyZ789..."` | 사용자 ID |
| `rented_date` | `2025-11-06` | 대여일 |
| `expired_date` | `2025-11-20` | 만료일 (14일 후) |
| `rented_shop_id` | `"shop_starbucks_123"` | 대여한 가게 |
| `rented_shop` | `"스타벅스 강남점"` | 가게명 |
| `status` | `"rent"` | 대여 중 |
| `division` | `"individual"` | 개별 반납 |

**추가 필터링**:
- `division` = `"individual"` 인 경우
- 현재 가게 ID와 `rented_shop_id`가 일치하는 것만 반납 가능

**필터 결과**:
- 현재 가게: `shop_starbucks_123`
- 대여한 가게: `shop_starbucks_123`
- ✅ 일치 → 반납 가능 (1개)

**DB 변화**: 없음 (조회만)

---

## Step 5: 반납 수량 선택

### 사용자가 하는 일:
```
화면 표시: "반납 가능한 컵: 1개"
사용자 선택: 1개
"확인" 버튼 클릭
```

**DB 변화**: 없음

---

## Step 6: 반납 확인

### 사용자가 하는 일:
```
반납 확인 화면:
  • 반납 개수: 1개
  • 보상 점수: 30 보틀

"반납하기" 버튼 클릭 (최종 확정)
```

**DB 변화**: 없음

---

## Step 7: 반납 처리 (최종 실행)

### 시스템이 하는 일:

---

#### 7-1. 대여 기록 상태 변경

#### ✅ DB 변화 ⑤: `rents` 문서 수정

**컬렉션**: `rents`
**문서 ID**: `rent_xyz789`

**변경 전**:
| 필드명 | 값 |
|--------|-----|
| `uid` | `"AbCd123XyZ789..."` |
| `rented_date` | `2025-11-06` |
| `expired_date` | `2025-11-20` |
| `rented_shop_id` | `"shop_starbucks_123"` |
| `status` | `"rent"` (대여 중) |
| `balance_id` | `"balance_abc123"` |

**변경 후**:
| 필드명 | 값 | 변화 |
|--------|-----|------|
| `uid` | `"AbCd123XyZ789..."` | 변화 없음 |
| `rented_date` | `2025-11-06` | 변화 없음 |
| `expired_date` | `2025-11-20` | 변화 없음 |
| `rented_shop_id` | `"shop_starbucks_123"` | 변화 없음 |
| `status` | `"return"` | ✅ **'rent' → 'return'** (반납 완료) |
| `returned_date` | `2025-11-06 13:00:00` | ✅ **추가** (반납 시간) |
| `returned_shop_id` | `"shop_starbucks_123"` | ✅ **추가** (반납한 가게 ID) |
| `returned_shop` | `"스타벅스 강남점"` | ✅ **추가** (반납한 가게명) |
| `balance_id` | `"balance_abc123"` | 변화 없음 |

**의미**: 대여 기록이 "대여 중" → "반납 완료" 상태로 변경

---

#### 7-2. 대여권 복구

#### ✅ DB 변화 ⑥: `balances` 문서 수정

**컬렉션**: `balances`
**문서 ID**: `balance_abc123`

**변경 전**:
| 필드명 | 값 |
|--------|-----|
| `user_id` | `"AbCd123XyZ789..."` |
| `status` | `"rent"` (사용 중) |
| `pgcode` | `"bottleclub"` |

**변경 후**:
| 필드명 | 값 | 변화 |
|--------|-----|------|
| `user_id` | `"AbCd123XyZ789..."` | 변화 없음 |
| `status` | `"charge"` | ✅ **'rent' → 'charge'** (재사용 가능) |
| `pgcode` | `"bottleclub"` | 변화 없음 |
| `update` | `2025-11-06 13:00:00` | ✅ **갱신** |

**의미**: 대여권이 "사용 중" → "사용 가능" 상태로 복구 (다시 대여 가능)

---

#### 7-3. 사용자 점수 적립

#### ✅ DB 변화 ⑦: `users` 문서 수정

**컬렉션**: `users`
**문서 ID**: `AbCd123XyZ789...`

**변경 전**:
| 필드명 | 값 |
|--------|-----|
| `uid` | `"AbCd123XyZ789..."` |
| `mobile` | `"01012345678"` |
| `score` | `0` |
| `coin` | `0` |
| `saving_all` | `0` |

**변경 후**:
| 필드명 | 값 | 변화 |
|--------|-----|------|
| `uid` | `"AbCd123XyZ789..."` | 변화 없음 |
| `mobile` | `"01012345678"` | 변화 없음 |
| `score` | `30` | ✅ **0 + 30 = 30** (보틀점수 증가) |
| `coin` | `300` | ✅ **0 + 300 = 300** (코인 증가) |
| `saving_all` | `1` | ✅ **0 + 1 = 1** (누적 반납 횟수) |

**계산식**:
- 보틀점수: 컵 1개당 30점 → 1개 × 30점 = 30점
- 코인: 점수 1점당 10코인 → 30점 × 10 = 300코인
- 누적 반납: 1개 반납 = +1

**의미**: 사용자 점수 적립

---

#### 7-4. 적립 내역 기록

#### ✅ DB 변화 ⑧: `collect_history` 컬렉션에 신규 문서 생성

**컬렉션**: `collect_history`
**문서 ID**: (자동 생성)

| 필드명 | 값 | 설명 |
|--------|-----|------|
| `score` | `30` | 적립된 점수 |
| `shop_id` | `"shop_starbucks_123"` | 반납한 가게 ID |
| `uid` | `"AbCd123XyZ789..."` | 사용자 ID |
| `create` | `2025-11-06 13:00:00` | 적립 시간 |

**의미**: 점수 적립 내역 기록 (이력 관리용)

---

### ✅ 반납 완료 후 최종 DB 상태:

| 컬렉션 | 변화 내용 |
|--------|----------|
| `users` | 1개 수정: score 0→30, coin 0→300, saving_all 0→1 |
| `balances` | 1개 수정: `status` = `'rent'` → `'charge'` (재사용 가능) |
| `rents` | 1개 수정: `status` = `'rent'` → `'return'`, 반납 정보 추가 |
| `collect_history` | 1개 생성: score=30, shop_id, uid 기록 |

---

### 📌 반납 완료 시점 데이터 구조:

```
users 컬렉션 (수정됨)
  └─ uid: AbCd123XyZ789...
       ├─ mobile: 01012345678
       ├─ score: 30 ✅ (0 → 30)
       ├─ coin: 300 ✅ (0 → 300)
       └─ saving_all: 1 ✅ (0 → 1)

balances 컬렉션 (복구됨)
  └─ 문서 ID: balance_abc123
       ├─ user_id: AbCd123XyZ789...
       └─ status: "charge" ✅ (다시 사용 가능!)

rents 컬렉션 (반납 완료)
  └─ 문서 ID: rent_xyz789
       ├─ uid: AbCd123XyZ789...
       ├─ status: "return" ✅ (반납 완료)
       ├─ rented_shop_id: shop_starbucks_123
       ├─ returned_date: 2025-11-06 13:00:00 ✅
       └─ returned_shop_id: shop_starbucks_123 ✅

collect_history 컬렉션 (신규 생성) ✅
  └─ 문서 ID: (자동 생성)
       ├─ score: 30
       ├─ shop_id: shop_starbucks_123
       └─ uid: AbCd123XyZ789...
```

---

# 📊 전체 프로세스 요약

## 대여 프로세스 - DB 변화 흐름:

```
1. 전화번호 인증 (Firebase Auth)
   ↓
2. users 컬렉션 조회
   ├─ 없으면 → 신규 생성 (score=0, coin=0)
   └─ 있으면 → 기존 사용자 사용
   ↓
3. balances 컬렉션 조회 (status='charge' 대여권 검색)
   └─ 신규 사용자는 무료 대여권 1개 자동 지급
   ↓
4. balances 문서 수정: status 'charge' → 'rent'
   ↓
5. rents 컬렉션에 신규 문서 생성
   └─ status='rent', expired_date=14일 후
```

---

## 반납 프로세스 - DB 변화 흐름:

```
1. 전화번호 인증 (Firebase Auth)
   ↓
2. users 컬렉션 조회 (기존 사용자 확인)
   ↓
3. rents 컬렉션 조회
   └─ status='rent' 문서 검색
   └─ division='individual'이면 같은 가게만 필터
   ↓
4. rents 문서 수정
   └─ status 'rent' → 'return'
   └─ returned_date, returned_shop_id 추가
   ↓
5. balances 문서 수정
   └─ status 'rent' → 'charge' (재사용 가능)
   ↓
6. users 문서 수정
   └─ score 증가 (컵 1개당 +30점)
   └─ coin 증가 (점수 1점당 +10코인)
   └─ saving_all 증가 (누적 반납 횟수 +1)
   ↓
7. collect_history 컬렉션에 신규 문서 생성
   └─ 적립 내역 기록
```

---

## 컬렉션별 역할:

| 컬렉션 | 역할 | 주요 필드 |
|--------|------|----------|
| **users** | 사용자 정보 관리 | uid, mobile, score, coin, saving_all |
| **balances** | 대여권 관리 | user_id, status, pgcode |
| **rents** | 대여/반납 기록 | uid, status, rented_shop_id, expired_date |
| **collect_history** | 점수 적립 내역 | uid, score, shop_id, create |

---

## 주요 상태 변화:

### balances 컬렉션의 status 필드:
```
"charge" (사용 가능)
   ↓ [대여 시]
"rent" (사용 중)
   ↓ [반납 시]
"charge" (재사용 가능)
```

### rents 컬렉션의 status 필드:
```
(문서 없음)
   ↓ [대여 시]
"rent" (대여 중)
   ↓ [반납 시]
"return" (반납 완료)
```

### 180일 경과 시 (자동 처리):
```
status: "rent" 또는 "charge"
   ↓ [180일 후 자동]
status: "lost" (분실 처리, 복구 불가)
```

---

## 📌 핵심 포인트:

### 신규 사용자:
- 무료 대여권 **1개** 자동 지급
- `balances` 컬렉션에 `status='charge'` 문서 생성

### 대여 시:
- `balances`: `status` = `'charge'` → `'rent'`
- `rents`: 신규 문서 생성 (`status='rent'`)

### 반납 시:
- `rents`: `status` = `'rent'` → `'return'`
- `balances`: `status` = `'rent'` → `'charge'` (복구)
- `users`: `score`, `coin`, `saving_all` 증가
- `collect_history`: 적립 내역 기록

### 만료 정책:
- **14일**: `expired_date` 도달 (경고만, 반납 가능)
- **180일**: 자동으로 `status='lost'` 처리 (반납 불가, 복구 불가)

### division 필드:
- `"individual"`: 대여한 가게에서만 반납 가능
- `"group"`: 같은 그룹 내 어느 가게에서나 반납 가능

### 점수 계산:
- 보틀점수: 컵 1개당 **30점**
- 코인: 점수 1점당 **10코인**
- 예: 컵 2개 반납 → 60점, 600코인
