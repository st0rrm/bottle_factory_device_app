# ReturnMeCup - Device App Frontend

리턴미컵 디바이스용 프론트엔드 애플리케이션 (React + Vite)

## 기술 스택

- React 19.1.1
- Vite 7.1.12
- Axios (API 통신)
- React Router DOM (라우팅)
- XLSX (엑셀 내보내기)

## 개발 환경 설정

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가:

```env
VITE_API_BASE_URL=http://localhost:3000/api
```

### 3. 백엔드 서버 실행

프론트엔드를 실행하기 전에 백엔드 서버가 실행 중이어야 합니다.

```bash
# 루트 디렉토리에서
cd server
npm run dev
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:5173 접속

## 빌드 및 배포

### 로컬 빌드

```bash
npm run build
```

빌드된 파일은 `dist/` 폴더에 생성됩니다.

### GitHub Pages 배포

```bash
npm run deploy
```

## 주요 기능

### 카페 디바이스용

- 컵 대여/반납 기능
- QR 코드 및 전화번호 인증
- 실시간 통계 조회
- 나무 성장 시각화

### 관리자용

- 카페 관리 (생성, 수정, 삭제)
- 전체 통계 조회
- 사용자 행동 분석

## 프로젝트 구조

```
project1/
├── src/
│   ├── api/              # API 통신 레이어
│   │   ├── axios.js      # Axios 인스턴스 설정
│   │   ├── auth.js       # 인증 API
│   │   ├── cafe.js       # 카페 관리 API
│   │   ├── statistics.js # 통계 API
│   │   └── behaviors.js  # 행동 추적 API
│   ├── components/       # 재사용 가능한 컴포넌트
│   ├── pages/            # 페이지 컴포넌트
│   │   ├── admin/        # 관리자 페이지
│   │   ├── home/         # 홈 페이지
│   │   └── login/        # 로그인 페이지
│   ├── assets/           # 정적 파일 (이미지, 폰트 등)
│   ├── App.jsx           # 루트 컴포넌트
│   └── main.jsx          # 진입점
├── public/               # 정적 파일
├── .env                  # 환경 변수 (git에 포함되지 않음)
├── .env.example          # 환경 변수 예시
└── vite.config.js        # Vite 설정
```

## API 연동

모든 API 호출은 `src/api/` 폴더의 모듈을 통해 이루어집니다.

### 예시: 통계 조회

```javascript
import { getMyStats } from './api/statistics';

const stats = await getMyStats();
console.log(stats); // { total: 100, today: 5, weekly: 20 }
```

### 인증

- 로그인 시 JWT 토큰이 `localStorage`에 저장됩니다
- Axios 인터셉터가 자동으로 모든 요청에 토큰을 추가합니다
- 401 에러 발생 시 자동으로 로그아웃 처리됩니다

## 폰트

이 프로젝트는 **Pretendard** 폰트를 사용합니다.

폰트 굵기 조정은 `font-weight` 속성으로만 하세요:
- `font-weight: 400` - Regular
- `font-weight: 600` - SemiBold
- `font-weight: 700` - Bold

## 환경 변수

### `.env` 파일 예시

```env
# API 서버 URL
VITE_API_BASE_URL=http://localhost:3000/api
```

배포 환경에서는 `.env.production` 파일을 생성하여 프로덕션 API URL을 설정하세요.

## 문제 해결

### CORS 에러

백엔드 서버의 CORS 설정을 확인하세요. `server/.env` 파일:

```env
CORS_ORIGIN=http://localhost:5173
```

### API 연결 실패

1. 백엔드 서버가 실행 중인지 확인
2. `.env` 파일의 `VITE_API_BASE_URL` 확인
3. 브라우저 콘솔에서 네트워크 탭 확인

## 라이선스

MIT
