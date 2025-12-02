# 보틀러(Bottler)
매장 내 다회용 컵 대여·반납을 간편하게, 환경 기여도를 시각적으로 보여주는 키오스크 솔루션

## 🌱 리턴미컵 소개
리턴미컵(ReturnMeCup)은 일회용 컵 사용을 줄이기 위한 다회용 컵 공유 서비스입니다. 사용자는 가맹 카페에서 보증금 없이 다회용 컵을 대여하고, 어느 가맹점에서나 반납할 수 있습니다. 이를 통해 일회용품 사용을 줄이고 자원 순환 경제를 실현하며, 환경 보호에 기여합니다. 하지만 기존에는 모바일 앱 설치가 필수였고, 매장 내에서 즉시 이용하기 어려운 문제가 있었습니다.

## 📝 프로젝트 개요

### 풀고자 하는 문제
1. **앱 설치 장벽**: 모바일 앱을 설치해야만 다회용 컵을 대여·반납할 수 있어 즉시 이용이 어렵습니다.
2. **환경 기여도 인식 부족**: 사용자가 자신의 환경 보호 활동이 얼마나 의미 있는지 실감하기 어렵습니다.
3. **접근성 문제**: 디지털 기기에 익숙하지 않은 사용자들은 복잡한 앱 사용에 어려움을 겪습니다.

### 해결책
보틀팩토리 디바이스 앱은 매장 내 키오스크에서 다회용 컵 서비스를 제공하며, 다음과 같은 기능을 제공합니다:

1. **간편한 키오스크 인터페이스**: 앱 설치 없이 매장 터치스크린에서 즉시 대여·반납이 가능합니다.
2. **3D 나무 시각화**: 매장의 환경 기여도를 성장하는 3D 나무로 표현하여 직관적으로 확인할 수 있습니다.
3. **AI 기반 음성 인식**: "포장", "테이크아웃"과 같은 자연어 음성 명령으로 도움말을 호출할 수 있습니다.
4. **실시간 통계 대시보드**: 가게 주인은 대여·반납 현황과 통계를 실시간으로 확인하고 Excel로 내보낼 수 있습니다.
5. **모바일 앱 연동**: bottleclub 모바일 앱과 Firebase를 통해 실시간으로 데이터를 동기화합니다.


### 기대 효과
1. **사용자 접근성 향상**: 앱 설치 없이 매장에서 즉시 서비스 이용 가능 (대여·반납 각 10초 이내)
2. **환경 보호 인식 증대**: 3D 나무 시각화로 환경 기여도를 직관적으로 인식하여 지속적인 참여 유도
3. **매장 운영 효율화**: 실시간 통계로 재고 관리 및 운영 전략 수립 지원
4. **커뮤니티 참여 확대**: 매장 단위 나무로 공동체 의식을 강화하고 지역 사회의 환경 보호 문화 확산

## 🛠️ 주요 기능

### 1. 다회용 컵 대여·반납
- **SMS 인증**: 전화번호 입력 + 6자리 인증 코드로 간편 로그인
- **신규 사용자 자동 처리**: 첫 이용 시 무료 이용권 1개 자동 발급
- **이용권 관리**: Firebase에서 실시간으로 이용권 상태(charge/rent) 관리
- **포인트 적립**: 반납 시 컵 1개당 10점 적립
- **크로스 플랫폼**: 모바일 앱과 키오스크 간 자유로운 대여·반납

### 2. 3D 보틀 나무 시각화
- **성장 시스템**: 반납 횟수에 따라 가지 추가, 누적 포인트에 따라 꽃·열매 해금
- **실시간 애니메이션**: 반납 즉시 나무 성장 애니메이션 재생
- **배경 변화**: 포인트에 따라 배경이 회색 → 파란 하늘 → 일몰 → 밤하늘로 변화
- **L-System 알고리즘**: 자연스러운 나무 구조 생성

### 3. AI 기반 음성 인식
- **웨이크워드 감지**: "포장", "테이크아웃" 등의 키워드로 도움말 자동 실행
- **자연어 처리**: Claude AI를 활용하여 다양한 표현 이해
- **실시간 분석**: 5초 세그먼트 단위로 음성을 분석하여 즉시 반응

### 4. 제로웨이스트 실천 기록
- **다양한 실천 항목**: 텀블러 사용, 다회용기 사용, 리필용기 사용, 자원순환 참여 등
- **포인트 적립**: 항목당 5~30점 적립
- **최대 5개 동시 선택**: 한 번에 여러 실천 활동 기록 가능

### 5. 관리자 대시보드
- **실시간 통계 조회**: 전체 가게의 대여·반납 현황, 오늘/주간 통계
- **Excel 내보내기**: 거래 내역을 날짜별로 필터링하여 엑셀 파일로 다운로드
- **가게 관리**: 신규 가게 등록, 정보 수정, 삭제
- **JWT 인증**: 가게 ID + PIN으로 안전한 로그인

## 🔧 개발 환경 (Development Environment)

### Frontend
- **Language**: JavaScript
- **Framework**: React 19.1.1
- **Build Tool**: Vite 7.1.12
- **Routing**: React Router DOM 7.9.4

### Backend
- **Language**: JavaScript (Node.js)
- **Framework**: Express
- **Database**: PostgreSQL, Firebase Firestore

### 3D Visualization
- **Framework**: Next.js
- **3D Library**: React Three Fiber, Three.js


## 📦 설치 및 실행 방법

https://returnme-cup-device-app.vercel.app

보틀러의 배포용 페이지입니다. 매장용 디스플레이로 다회용 컵 대여·반납 서비스를 이용할 수 있습니다.

### 로컬 개발 환경 설정

#### 1. 저장소 클론
```bash
git clone https://github.com/yourusername/bottle_factory_device_app.git
cd bottle_factory_device_app
```

#### 2. Backend 실행
```bash
cd server
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일 편집 (DB 연결 정보, Firebase Admin SDK 키 등)

# PostgreSQL 실행 (Docker)
docker-compose up -d

# 데이터베이스 스키마 생성
psql -U returnmecup -d returnmecup_db
\i database/init.sql

# 서버 시작
npm run dev  # Port 3000
```

#### 3. Frontend 실행
```bash
cd project1
npm install

# 환경 변수 설정
cp .env.example .env
# .env 파일 편집 (Firebase 설정, API URL 등)

# 개발 서버 시작
npm run dev  # Port 5173
```

#### 4. 접속
브라우저에서 `http://localhost:5173` 접속

### 주요 명령어
```bash
# Frontend
cd project1
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm run preview      # 빌드 미리보기

# Backend
cd server
npm run dev          # 개발 서버 (nodemon)
npm start            # 프로덕션 서버

# PostgreSQL
docker-compose up -d           # 데이터베이스 시작
docker-compose down            # 데이터베이스 중지
```

