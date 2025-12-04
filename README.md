# 보틀커넥트 (BottleConnect)
매장 내 다회용 컵 대여·반납을 간편하게, 환경 기여도를 시각적으로 보여주는 디바이스 솔루션

## 🌱 리턴미 컵 소개
"리턴미 컵"은 일회용 컵 사용을 줄이기 위한 다회용 컵 공유 서비스입니다. 사용자는 제휴 카페에서 보증금 없이 다회용 컵을 사용할 수 있습니다. 이를 통해 일회용품 사용을 줄이며 환경 보호에 기여합니다. 하지만 기존에는 모바일 앱 설치가 필수였고, 매장 내에서 즉시 이용하기 어려운 문제가 있었습니다.

## 📝 프로젝트 개요

### 풀고자 하는 문제
1. **전용 앱 설치 장벽**: 모바일 앱을 설치해야만 다회용 컵을 대여·반납할 수 있어 즉시 이용이 어렵습니다.
2. **환경 기여도 인식 부족**: 사용자가 자신의 친환경 실천이 얼마나 의미 있는지 실감하기 어렵습니다.
3. **접근성 문제**: 디지털 기기에 익숙하지 않은 사용자들은 복잡한 앱 사용에 어려움을 겪습니다.

### 해결책
보틀팩토리 디바이스 앱은 매장 내 디바이스에서 다회용 컵 서비스를 제공하며, 다음과 같은 기능을 제공합니다:

1. **간편한 디바이스 인터페이스**: 앱 설치 없이 매장 터치스크린에서 즉시 대여·반납이 가능합니다.
2. **친환경 나무 시각화**: 매장의 친환경 실천 정도를 나무로 표현하여 직관적으로 확인할 수 있습니다.
3. **LLM 기반 음성 인식**: 포장 주문하는 사용자를 인식해 리턴미컵 서비스를 안내합니다.
4. **실시간 통계 대시보드**: 가게 주인은 대여·반납 현황과 통계를 실시간으로 확인하고 Excel로 내보낼 수 있습니다.
5. **모바일 앱 연동**: 디바이스에서 적립한 친환경 점수는 모바일 앱의 사용자 계정에도 동기화됩니다.


### 기대 효과
1. **사용자 접근성 향상**: 앱 설치 없이 매장에서 즉시 서비스 이용 가능 (대여·반납 각 10초 이내)
2. **환경 보호 인식 증대**: 친환경 나무 시각화로 환경 기여도를 직관적으로 인식하여 지속적인 참여 유도
3. **매장 운영 효율화**: 실시간 통계로 재고 관리 및 운영 전략 수립 지원
4. **커뮤니티 참여 확대**: 매장 단위 나무로 공동체 의식을 강화하고 지역 사회의 환경 보호 문화 확산

## 🛠️ 주요 기능

### 1. 다회용 컵 대여·반납
- **전화번호 기반 작동**: 전화번호를 입력해 사용자 간편인증 (신규 사용자의 경우 최초 1회 SMS 인증)
- **신규 사용자 자동 처리**: 첫 이용 시 무료 이용권 1개 자동 발급
- **이용권 관리**: Firebase에서 실시간으로 이용권 상태(charge/rent) 관리
- **포인트 적립**: 반납 시 컵 1개당 10점 적립
- **크로스 플랫폼**: 기존 앱과 디바이스 간 자유로운 대여·반납

### 2. 친환경 보틀 나무 시각화
- **성장 시스템**: 친환경 실천 횟수에 따라 가지 추가, 누적 포인트에 따라 꽃·열매 해금
- **실시간 애니메이션**: 친환경 실천에 따른 나무 성장 애니메이션 재생
- **L-System 알고리즘**: 자연스러운 나무 구조 생성

### 3. LLM 기반 음성 인식
- **대화 컨텍스트 파악**: 일회용 컵을 사용하는 포장 주문을 인식
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

## 팀원 및 팀원 소개

### Team Bottler

**문준혁 (Junhyeok Moon)** - UI/UX Designer, Planner
Mail: munjh0929@gmail.com   | GitHub: [babocat](https://github.com/babocat)

**박주언 (Jueon Park)** - UI/UX Designer, Planner
Mail: jueon0924@kaist.ac.kr | GitHub: [jjjueon](https://github.com/jjjueon)

**이휘원 (Hwiwon Lee)** - PM, Developer
Mail: ted3047@kaist.ac.kr   | GitHub: [IJ4N](https://github.com/IJ4N)

**문준원 (Junwon Moon)** - Frontend Developer
Mail: storm4416@kaist.ac.kr | GitHub: [st0rrm](https://github.com/st0rrm)

**박건우 (Geonwoo Park)** - Backend Developer
Mail: geonwoo7321@gmail.com | GitHub: [gwpark1234](https://github.com/gwpark1234)

### Kakao Mentors

**정윤영 (aqua)** - Kakao Healthcare

**이상은 (leesa.l)** - Kakaopay

### Fellow

**정다운** - Bottlefactory
Mail: dawoon@bottlefactory.co.kr
