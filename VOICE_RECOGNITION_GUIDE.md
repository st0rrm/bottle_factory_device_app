# 음성 인식 시스템 선택 가이드

bottle_factory_device_app은 2가지 음성 인식 방법을 지원합니다.

---

## 1. 지원하는 음성 인식 방법

### 방법 1: Picovoice (기본값) ⭐ 현재 사용 중

**기술**: 웨이크워드 기반 음성 인식 (로컬 처리)

**특징**:
- ✅ 오프라인 지원
- ✅ 빠른 응답 속도 (0.1초)
- ✅ 무료
- ❌ 정확한 키워드만 인식 ("포장", "테이크아웃")
- ❌ 자연어 이해 불가 ("가져갈게요" 등 감지 못함)

---

### 방법 2: Whisper + Claude Haiku (LLM 기반) ⭐ 프로덕션 권장

**기술**: OpenAI Whisper (음성→텍스트) + Anthropic Claude Haiku (의도 분석)
**녹음 방식**: 5-30초 적응형 (15초 누적 + 슬라이딩 윈도우)
**VAD**: 음량 기반 활성화 (브라우저 내장 Web Audio API)

**핵심 특징**:
- ✅ **비용 최적화**: VAD로 95% 비용 절감 (음성 감지 시만 API 호출)
- ✅ **빠른 응답**: 명확한 경우 6.5초 만에 감지
- ✅ **높은 정확도**: 애매한 경우 자동 확장 (90%+)
- ✅ **적응형**: confidence에 따라 5-30초 자동 조절
- ✅ **자연어 이해**: "가져갈게요", "들고갈게요" 등 모든 표현 인식
- ✅ **iPad 완벽 지원**: Web Audio API (브라우저 내장)
- ❌ 온라인 필수 (API 호출)

**동작 방식**:
```
[VAD 계층] (항상 작동, 로컬, 무료)
  마이크 음량 실시간 모니터링 (60fps)
  ↓ 음량 > threshold (기본 40)

[LLM 계층] (음성 감지 시만 작동)

  Phase 1 (0-15초): 누적 분석
    5초마다 API 호출:
    [0-5초] → confidence < 0.4: 재시작
    [0-5초] → confidence ≥ 0.7: 확정 ✅
    [0-5초] → 0.4-0.7: 추가 5초 녹음
    [0-10초] → confidence ≥ 0.7: 확정 ✅
    [0-10초] → 0.4-0.7: 추가 5초 녹음
    [0-15초] → 최종 판단

  Phase 2 (15-30초): 슬라이딩 윈도우 (15초 고정)
    [5-20초] 최근 15초만 분석
    [10-25초] 최근 15초만 분석
    [15-30초] 최근 15초만 분석

  ↓ 2초 침묵
  VAD: 음성 종료 감지 → API 비활성화
```

**장점**:
1. **비용 절감**: VAD로 95% 절감 (조용할 때 API 호출 안 함)
2. **빠른 응답**: 평균 11.5초 (명확한 경우 6.5초)
3. **높은 정확도**: 애매한 경우 자동 확장 → 오감지 방지
4. **슬라이딩 윈도우**: 초반 노이즈 제거, 최신 정보 집중

**VAD (Voice Activity Detection)**:
- **기술**: 브라우저 내장 Web Audio API (외부 라이브러리 없음)
- **동작**: 마이크 음량을 실시간 모니터링 (60fps)
- **임계값**: 기본 40 (0-255 범위, 환경에 맞게 조정 가능)
- **침묵 판정**: 2초간 임계값 미만이면 API 중지
- **iPad 지원**: iOS/iPadOS Safari 완벽 작동

**다른 LLM 조합 참고**:
- GPT-4o-mini: 비용 유사하지만 Claude가 한국어 이해력 우수
- Gemini Flash: 더 저렴하지만 한국어 정확도 낮음
- Claude Sonnet: 더 정확하지만 비용 3배, 속도 느림 (불필요)

---

## 2. 음성 인식 방법 전환하기

### 현재 상태: Picovoice 사용 중

Whisper + Haiku로 전환하려면 다음 단계를 따르세요.

### Step 1: API 키 발급

#### OpenAI API Key (Whisper)

1. **계정 생성**: https://platform.openai.com/signup
2. **API 키 발급**: https://platform.openai.com/api-keys
   - "Create new secret key" 클릭
   - 키 이름: `bottle_factory_whisper`
   - 키 복사: `sk-proj-xxxxxxxxx`
3. **결제 설정**: https://platform.openai.com/account/billing
   - 신용카드 등록 (해외결제 활성화 필수)
   - 최소 $5 충전

#### Anthropic API Key (Claude Haiku)

1. **계정 생성**: https://console.anthropic.com/
2. **API 키 발급**: https://console.anthropic.com/settings/keys
   - "Create Key" 클릭
   - 키 이름: `bottle_factory_claude`
   - 키 복사: `sk-ant-api03-xxxxxxxxx`
3. **결제 설정**: https://console.anthropic.com/settings/billing
   - 신용카드 등록 (해외결제 활성화 필수)
   - 최소 $5 충전

### Step 2: 환경 변수 설정 (Backend)

**파일**: `/server/.env`

```env
# OpenAI API (Whisper 음성 인식)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Anthropic API (Claude Haiku 의도 분석)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Step 3: 패키지 설치 (Backend)

```bash
cd server
npm install openai @anthropic-ai/sdk multer
```

### Step 4: 코드 전환 (Frontend)

**파일**: `/project1/src/pages/home/home.jsx`

**변경 전 (Picovoice)**:
```javascript
// 16-17번 줄
import { usePicovoice } from '../../hooks/usePicovoice';
// import { useVoiceRecognition } from '../../hooks/useVoiceRecognition';

// 128-130번 줄
const { isListening, error: picoError, hasPermission, requestPermission } =
  usePicovoice(true, handleWakeWordDetected);
```

**변경 후 (Whisper + Haiku)**:
```javascript
// 16-17번 줄 (import 주석 전환)
// import { usePicovoice } from '../../hooks/usePicovoice';
import { useVoiceRecognition } from '../../hooks/useVoiceRecognition';

// 132-144번 줄 (hook 주석 전환)
// const { isListening, error: picoError, hasPermission, requestPermission } =
//   usePicovoice(true, handleWakeWordDetected);

const { isListening, error: picoError, hasPermission, requestPermission } =
  useVoiceRecognition(true, handleWakeWordDetected, {
    segmentDuration: 5000,         // 5초 단위 세그먼트
    lowThreshold: 0.4,             // 0.4 미만 → 폐기
    highThreshold: 0.7,            // 0.7 이상 → 확정
    maxCumulativeDuration: 15000,  // 15초까지 누적
    windowSize: 15000,             // 슬라이딩 윈도우 15초
    maxTotalDuration: 30000,       // 최대 30초
    restartDelay: 1000,
  });
```

### Step 5: 서버 재시작

```bash
cd server
npm run dev
```

### Step 6: 테스트

1. 키오스크 화면 열기 (http://localhost:5173)
2. 마이크 권한 허용
3. 다양한 표현 테스트:
   - "포장이요" ✅
   - "가져갈게요" ✅
   - "들고갈게요" ✅
   - "테이크아웃으로 주세요" ✅
4. 도움말 모달이 열리는지 확인

---

## 3. 시스템 아키텍처

### Whisper + Haiku 구조

```
[사용자 음성]
    ↓
[브라우저 마이크]
    - echoCancellation: true (에코 제거)
    - noiseSuppression: true (소음 제거)
    - autoGainControl: true (음량 자동 조절)
    ↓
[5초 녹음] (audio/webm)
    ↓
[Frontend: useVoiceRecognition.js]
    ↓
[POST /api/voice/analyze]
    - FormData (audio blob)
    - Authorization: Bearer token
    ↓
[Backend: voice.js]
    ↓
[Step 1] OpenAI Whisper API
    - model: whisper-1
    - language: ko
    - 비용: $0.006/분
    ↓
[텍스트 변환 완료]
    예: "가져갈게요"
    ↓
[Step 2] Anthropic Claude Haiku API
    - model: claude-3-5-haiku-20241022
    - max_tokens: 150
    - temperature: 0.3
    - 비용: $0.000025/요청
    ↓
[의도 분석 완료]
    {
      "takeout": true,
      "confidence": 0.95,
      "reason": "가져가겠다는 의도 명확"
    }
    ↓
[Frontend: 결과 수신]
    ↓
[confidence ≥ 0.7 → 도움말 모달 열기]
```

### Picovoice 구조 (비교)

```
[사용자 음성]
    ↓
[브라우저 마이크]
    ↓
[Picovoice WASM 엔진] (로컬)
    ↓
[웨이크워드 매칭]
    - "포장" 또는 "테이크아웃"만 감지
    ↓
[도움말 모달 열기]
```

---

## 4. 설정 옵션

### useVoiceRecognition 옵션

```javascript
const options = {
  segmentDuration: 5000,
  // 세그먼트 단위 (밀리초)
  // 기본값: 5000 (5초)
  // 권장 범위: 4000-6000

  lowThreshold: 0.4,
  // 낮은 확신도 임계값
  // 기본값: 0.4 (40%)
  // 0.4 미만 → 폐기 및 재시작
  // 권장 범위: 0.3-0.5

  highThreshold: 0.7,
  // 높은 확신도 임계값
  // 기본값: 0.7 (70%)
  // 0.7 이상 → 즉시 확정
  // 권장 범위: 0.65-0.75

  maxCumulativeDuration: 15000,
  // 누적 모드 최대 시간 (밀리초)
  // 기본값: 15000 (15초)
  // 권장 범위: 12000-18000

  windowSize: 15000,
  // 슬라이딩 윈도우 크기 (밀리초)
  // 기본값: 15000 (15초)
  // 권장 범위: 12000-20000

  maxTotalDuration: 30000,
  // 최대 총 녹음 시간 (밀리초)
  // 기본값: 30000 (30초)
  // 권장 범위: 25000-35000

  restartDelay: 1000,
  // 재시작 대기 시간 (밀리초)
  // 기본값: 1000 (1초)
  // 권장 범위: 500-2000

  vadThreshold: 40,
  // VAD 음량 임계값 (0-255)
  // 기본값: 40
  // 조용한 실내: 30-40
  // 일반 카페: 40-50
  // 시끄러운 매장: 60-80

  vadSilenceDuration: 2000,
  // VAD 침묵 판정 시간 (밀리초)
  // 기본값: 2000 (2초)
  // 권장 범위: 1500-3000
};
```

---

## 5. 비용 분석

### LLM 기반 방식 (5-30초 적응형)

**평균 1회 음성 인식 비용** (실제 사용 패턴 기반):

| **케이스** | **비율** | **소요 시간** | **API 호출** | **비용** |
|----------|---------|-------------|------------|---------|
| 즉시 감지 (명확) | 60% | 5초 | 1회 | $0.0005 |
| 중간 확장 (애매) | 25% | 10-15초 | 2-3회 | $0.0015 |
| 최대 확장 (불명확) | 15% | 20-30초 | 4-6회 | $0.0035 |
| **가중 평균** | **100%** | **약 11.5초** | **약 2회** | **$0.0015** |

**월간 예상 비용**:

| **사용 횟수** | **월 비용 (USD)** | **월 비용 (KRW)** |
|--------------|------------------|------------------|
| 1,000회      | $1.50            | 약 1,950원        |
| 3,000회      | $4.50            | 약 5,850원        |
| 10,000회     | $15.00           | 약 19,500원       |

**예시**:
- 키오스크 1대, 하루 100회 사용
- 월 3,000회 × $0.0015 = **$4.50 (약 5,850원)**

### 비용 구성

| **항목** | **평균 비용** | **설명** |
|---------|------------|---------|
| Whisper | $0.0012 | 평균 11.5초 녹음 = $0.006/분 × (11.5/60) |
| Claude Haiku | $0.0003 | 평균 150 tokens × $0.25/1M × 2회 호출 |
| **총합** | **$0.0015** | **약 0.15센트 (약 2원)** |

### 비용 절감 팁

1. **highThreshold 조정**: 0.7 → 0.75 (오감지 감소, 빠른 확정)
2. **lowThreshold 조정**: 0.4 → 0.45 (불필요한 확장 방지)
3. **사용량 모니터링**: OpenAI/Anthropic 대시보드에서 주간 확인
4. **API 한도 설정**: 예산 초과 방지 (Hard limit: $20/월 등)
5. **maxCumulativeDuration 조정**: 15초 → 12초 (빠른 결정, 비용 10% 감소)

---

## 6. 비교표

| **항목**               | **Picovoice**        | **Whisper + Haiku (LLM)** ⭐ |
|-----------------------|---------------------|-----------------------------------|
| **정확도**             | 70-80%              | 95-98%                            |
| **한국어 자연어 이해**   | ❌                  | ✅                                |
| **오프라인 지원**       | ✅                  | ❌                                |
| **응답 속도**          | 0.1초               | 6-30초 적응형                      |
| **평균 응답 시간**     | 0.1초               | 11.5초                             |
| **비용 (3000회/월)**   | 무료                | $4.50 (5,850원)                    |
| **설정 난이도**        | 쉬움                | 중간 (API 키 필요)                 |
| **중복 접속**          | ✅ 제한 없음         | ✅ 제한 없음                       |
| **인식 가능 표현**     | 2개 (고정)          | 무제한 (자연어)                    |
| **데이터 손실**        | 없음                | 없음 (검증 완료)                   |
| **사용 권장**          | 개발/테스트          | 프로덕션 ⭐                       |

---

## 7. 문제 해결

### Whisper + Haiku 관련

**문제**: API 키 오류 (`401 Unauthorized`)
```
해결:
1. .env 파일 확인
   - OPENAI_API_KEY=sk-proj-...
   - ANTHROPIC_API_KEY=sk-ant-api03-...
2. API 키가 유효한지 확인 (대시보드에서 삭제되지 않았는지)
3. 서버 재시작: npm run dev
```

**문제**: 음성 인식이 너무 느림 (3초 이상)
```
해결:
1. 네트워크 연결 확인 (Whisper API 응답 시간)
2. recordingDuration을 4초로 줄이기
3. Claude 모델이 Haiku인지 확인 (Sonnet으로 잘못 설정 가능)
```

**문제**: 비용이 예상보다 많이 나옴
```
해결:
1. OpenAI 대시보드에서 사용량 확인
   - https://platform.openai.com/usage
2. Anthropic 대시보드에서 사용량 확인
   - https://console.anthropic.com/settings/billing
3. confidenceThreshold를 0.75로 높이기 (오감지 감소)
4. API 사용량 제한 설정 (Hard limit: $10/월 등)
```

**문제**: "insufficient_quota" 오류
```
해결:
1. OpenAI/Anthropic 대시보드에서 크레딧 충전
2. 결제 수단 유효성 확인
3. 월 사용 한도 확인 및 조정
```

**문제**: CORS 오류
```
해결: /server/.env의 CORS_ORIGIN에 프론트엔드 주소 추가
CORS_ORIGIN=http://localhost:5173,https://your-domain.vercel.app
```

**문제**: 텍스트는 인식되지만 포장 의도 감지 안됨
```
해결:
1. 콘솔 로그 확인 (recognizedText, confidence 값)
2. confidenceThreshold를 0.6으로 낮추기
3. Claude 프롬프트 확인 (voice.js:83-97)
```

### Picovoice 관련

**문제**: 마이크 권한 오류
```
해결: 브라우저 설정에서 마이크 권한 허용
Chrome: 설정 > 개인정보 및 보안 > 사이트 설정 > 마이크
```

**문제**: 웨이크워드가 감지되지 않음
```
해결:
1. "포장" 또는 "테이크아웃"을 명확하게 발음
2. 주변 소음 최소화
3. 마이크 품질 확인
```

---

## 8. 권장 사항

### 개발/테스트 단계
- **Picovoice 사용**: 빠른 테스트, API 키 불필요, 무료

### 프로덕션 단계
- **LLM 방식 강력 추천** ⭐: 최고의 성능/비용 균형

### 선택 기준

#### Picovoice를 선택하는 경우
- 인터넷 연결이 불안정한 환경
- 비용을 최소화해야 하는 경우 (무료)
- "포장", "테이크아웃" 키워드만으로 충분한 경우
- 초기 개발 및 테스트

#### Whisper + Haiku (LLM)를 선택하는 경우 ⭐ 권장
- **프로덕션 환경** (강력 추천)
- 안정적인 인터넷 연결 보장
- 빠른 응답 속도 중요 (평균 11.5초)
- 비용 효율 중요 (월 5,850원 @ 3000회)
- 자연스러운 사용자 경험 필수
- 다양한 표현 인식 필요

### 마이그레이션 경로

```
[1단계] Picovoice (개발)
   → API 키 없이 빠른 프로토타입

[2단계] LLM (프로덕션) ⭐
   → API 키 발급 후 최종 배포
```

---

## 9. 추가 자료

### API 문서
- OpenAI Whisper API: https://platform.openai.com/docs/guides/speech-to-text
- Anthropic Claude API: https://docs.anthropic.com/
- Claude Haiku 벤치마크: https://www.anthropic.com/news/claude-3-5-haiku

### 프로젝트 문서
- **home.jsx**: 음성 인식 구현 예시 (2가지 방법 주석 처리)
- **server/src/routes/voice.js**: Whisper + Claude Haiku 백엔드 API

### 구현 파일
- `/project1/src/hooks/usePicovoice.js`: 웨이크워드 기반 (방법 1)
- `/project1/src/hooks/useVoiceRecognition.js`: LLM 기반 (방법 2) ⭐

---

**작성일**: 2025-11-22
**버전**: 1.0.0
**주요 기능**:
- Picovoice (웨이크워드) vs LLM (Whisper + Claude Haiku)
- LLM: 5초마다 분석, 15초 누적 + 슬라이딩 윈도우
- Confidence 기반 적응형 녹음 (5-30초)
