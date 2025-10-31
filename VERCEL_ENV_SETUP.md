# Vercel 환경 변수 설정 가이드

Vercel에 배포할 때 필요한 환경 변수 설정 방법입니다.

## Vercel Dashboard에서 설정

1. **Vercel Dashboard** 접속: https://vercel.com
2. **프로젝트 선택** (bottle_factory_device_app)
3. **Settings** → **Environment Variables** 탭

## 필수 환경 변수 추가

아래 환경 변수들을 **Production**, **Preview**, **Development** 모두에 체크하고 추가하세요:

### 1. API 서버 URL
```
VITE_API_BASE_URL=https://returnmecup-api-dev.onrender.com/api
```

### 2. Firebase 설정
```
VITE_FIREBASE_API_KEY=AIzaSyAB9uNd_hDebX3Fpcnu89fn7yaEJOpb0pk
VITE_FIREBASE_AUTH_DOMAIN=linkwithexpo.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://linkwithexpo-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=linkwithexpo
VITE_FIREBASE_STORAGE_BUCKET=linkwithexpo.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1065020310463
VITE_FIREBASE_APP_ID=1:1065020310463:web:48b057237d8cc749b8170a
VITE_FIREBASE_MEASUREMENT_ID=G-3GZZWN8S39
```

### 3. 디바이스 Shop ID

**중요**: 각 디바이스마다 다른 shopId를 설정해야 합니다!

```
VITE_DEVICE_SHOP_ID=05THWyH9oRw1TH9YtNf4
```

**사용 가능한 Shop ID 목록** (Firestore shops 컬렉션):
- `05THWyH9oRw1TH9YtNf4` - 플라프리 (서울 동작구)
- `085mZ4uFosFY5ShpruaK` - 셉틱탱크 스토어 (서울 서대문구)
- `0EOGLLjhs6epn0rD2RUs` - 어뮤즈그라운드 (서울 서대문구)
- `0FfI5vH7Tth0gtXEgfZc` - 치코 (전북 군산시)
- `0Y7I0utPYEoBCYrOu4lm` - 비건마마 (서울 관악구)

## 환경 변수 입력 예시

Vercel Dashboard에서:

```
Name: VITE_FIREBASE_API_KEY
Value: AIzaSyAB9uNd_hDebX3Fpcnu89fn7yaEJOpb0pk
[✓] Production
[✓] Preview
[✓] Development
[Add] 클릭
```

이 과정을 **모든 환경 변수**에 대해 반복합니다.

## 주의사항

1. **변수 이름은 정확히 입력**
   - Vite는 `VITE_`로 시작하는 환경 변수만 인식합니다
   - 오타 주의!

2. **값에 공백이나 따옴표 없이 입력**
   - ✅ `AIzaSyAB9uNd...`
   - ❌ `"AIzaSyAB9uNd..."`
   - ❌ ` AIzaSyAB9uNd...` (앞에 공백)

3. **모든 환경에 체크**
   - Production: 실제 배포 환경
   - Preview: PR/브랜치 미리보기
   - Development: 로컬 개발 (선택사항)

## 재배포

환경 변수를 추가/수정한 후:

1. **Deployments** 탭으로 이동
2. 최신 배포 선택
3. **⋯** (점 3개) 클릭 → **Redeploy**
4. 재배포 완료 대기 (~1분)

## 확인 방법

배포 후 브라우저 개발자 도구(F12)에서:

```javascript
// Console에서 실행
console.log(import.meta.env.VITE_FIREBASE_PROJECT_ID)
// 출력: "linkwithexpo"

console.log(import.meta.env.VITE_DEVICE_SHOP_ID)
// 출력: "05THWyH9oRw1TH9YtNf4"
```

## 보안 참고사항

Firebase API Key는 **공개되어도 안전**합니다:
- Firebase는 인증 규칙(Security Rules)으로 보호됨
- API Key는 프로젝트 식별용일 뿐
- 실제 권한은 Firestore Security Rules로 제어

하지만 GitHub에 업로드할 때는 `.env` 파일이 `.gitignore`에 포함되어 있는지 확인하세요!

## 다중 디바이스 배포

여러 카페에 각각 다른 디바이스를 배포하려면:

### 방법 1: 브랜치별 배포 (권장)
```bash
# 플라프리용 브랜치
git checkout -b deploy-plafully
# Vercel에서 브랜치별 환경 변수 설정
# VITE_DEVICE_SHOP_ID=05THWyH9oRw1TH9YtNf4

# 셉틱탱크용 브랜치
git checkout -b deploy-septictank
# VITE_DEVICE_SHOP_ID=085mZ4uFosFY5ShpruaK
```

### 방법 2: 프로젝트 복제
- Vercel에서 여러 프로젝트 생성
- 각 프로젝트마다 다른 `VITE_DEVICE_SHOP_ID` 설정

## 문제 해결

### "Firebase: Error (auth/configuration-not-found)"
- Firebase 환경 변수가 제대로 설정되지 않음
- Vercel Dashboard에서 모든 `VITE_FIREBASE_*` 변수 확인
- 재배포 후 테스트

### "shopId가 undefined"
- `VITE_DEVICE_SHOP_ID`가 설정되지 않음
- 환경 변수 추가 후 재배포

### "대여 처리 실패: shop not found"
- shopId가 Firestore에 존재하지 않음
- 유효한 shop ID 목록에서 선택하여 재설정
