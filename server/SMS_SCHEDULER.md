# SMS 알림 스케줄러

반납일자 알림 SMS를 자동으로 발송하는 스케줄러입니다.

## 작동 방식

- **실행 시간**: 매일 12:00 (한국 시간)
- **대상**: `rents` 컬렉션에서 `status: 'rent'`인 모든 대여건
- **알림 설정**: Firebase `constants.bottle_club.notifications` 배열에서 가져옴

## 알림 설정 구조

Firebase `constants` 컬렉션의 `bottle_club` 문서에 다음과 같은 구조로 저장:

```javascript
{
  notifications: [
    {
      day: 3,
      title: "반납 예정일 안내",
      body: "대여하신 컵의 반납일이 3일 남았습니다.\n늦지 않게 반납해주세요!"
    },
    {
      day: 7,
      title: "반납일 1주일 경과",
      body: "대여하신 컵의 반납일이 1주일 지났습니다.\n빠른 반납 부탁드립니다."
    },
    {
      day: 14,
      title: "반납 기한 만료",
      body: "대여하신 컵의 반납 기한이 만료되었습니다.\n반드시 반납해주세요."
    }
  ]
}
```

## 환경변수 설정

`.env` 파일에 다음 환경변수를 추가하세요:

```env
# SMS Configuration (Aligo SMS API)
SMS_API_KEY=your-aligo-api-key-here
SMS_USER_ID=your-aligo-user-id-here
SMS_SENDER=01012345678
```

### Aligo SMS API 설정 방법

1. [Aligo SMS](https://smartsms.aligo.in) 회원가입
2. API Key 발급 받기
3. 발신번호 등록 및 승인
4. `.env` 파일에 정보 입력

## 로직

1. Firebase `constants.bottle_club` 문서에서 `notifications` 배열 조회
2. `rents` 컬렉션에서 `status: 'rent'`인 대여건 조회
3. 각 대여건에 대해:
   - 대여일(`rented_date`)로부터 경과일 계산
   - `notifications` 배열에서 경과일과 일치하는 알림 찾기
   - 일치하는 알림이 있으면:
     - `users` 컬렉션에서 `uid`로 사용자 정보 조회
     - `mobile` 필드에서 전화번호 가져오기
     - SMS 발송

## 예시

대여일: 2025-01-01
현재일: 2025-01-04
경과일: 4일 (Math.floor((현재일 - 대여일) / 1일) + 1)

→ `notifications` 배열에 `day: 4`인 알림이 없으면 발송 안 함
→ `notifications` 배열에 `day: 4`인 알림이 있으면 해당 메시지 발송

## 테스트

개발 환경에서 테스트하려면:

1. Firebase에 테스트용 `rents` 문서 추가
2. `rented_date`를 원하는 날짜로 설정
3. 서버 재시작: `npm run dev`
4. 12시에 자동 실행되거나, 수동으로 함수 호출

## 주의사항

- SMS API 비용이 발생하므로 운영 환경에서만 활성화 권장
- 개발 환경에서는 `SMS_API_KEY`를 설정하지 않으면 발송되지 않고 로그만 출력됩니다
- 전화번호가 없는 사용자는 건너뜁니다 (`users.mobile` 필드 확인)
