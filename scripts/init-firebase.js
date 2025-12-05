#!/usr/bin/env node

/**
 * Firebase Firestore 초기 데이터 생성 스크립트
 *
 * 사용법:
 * 1. Firebase 콘솔에서 서비스 계정 키 다운로드
 * 2. 이 스크립트와 같은 폴더에 service-account.json으로 저장
 * 3. npm install firebase-admin (프로젝트 루트에서)
 * 4. node scripts/init-firebase.js
 */

const admin = require('firebase-admin');
const path = require('path');

// 서비스 계정 키 파일 경로
const serviceAccountPath = path.join(__dirname, 'service-account.json');

console.log('\n🚀 Firebase Firestore 초기화 시작...\n');

// Firebase Admin 초기화
try {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('✅ Firebase Admin 초기화 완료');
} catch (error) {
  console.error('\n❌ 오류: service-account.json 파일을 찾을 수 없습니다.');
  console.error('\n📌 해결 방법:');
  console.error('1. Firebase 콘솔 → 프로젝트 설정 → 서비스 계정');
  console.error('2. "새 비공개 키 생성" 클릭');
  console.error('3. 다운로드한 JSON 파일을 scripts/service-account.json으로 저장');
  console.error('4. 다시 실행: node scripts/init-firebase.js\n');
  process.exit(1);
}

const db = admin.firestore();

async function initializeFirestore() {
  try {
    console.log('\n📦 1. items 컬렉션 생성...');

    // 다회용 컵 아이템 생성
    const cupItemRef = await db.collection('items').add({
      name: '다회용 컵',
      score: 30,
      order: 1,
      returnme: true,
      create: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`   ✅ 다회용 컵 생성: ${cupItemRef.id}`);

    // 텀블러 아이템 생성
    const tumblerItemRef = await db.collection('items').add({
      name: '텀블러',
      score: 50,
      order: 2,
      returnme: false,
      create: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`   ✅ 텀블러 생성: ${tumblerItemRef.id}`);

    console.log('\n🏪 2. shops 컬렉션 생성...');

    // 테스트 카페 생성
    await db.collection('shops').doc('test-cafe-01').set({
      name: '테스트 카페 (플라프리)',
      division: 'individual',
      items: [cupItemRef.id],
      pin: '1234',
      address: '서울특별시 서대문구 연희동',
      latitude: 37.5665,
      longitude: 126.9780,
      create: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('   ✅ 테스트 카페 생성: test-cafe-01');

    console.log('\n🎫 3. goods 컬렉션 생성...');

    // 무료 대여권 상품 생성
    const freeGoodsRef = await db.collection('goods').add({
      name: '무료 대여권',
      price: 0,
      type: 'free',
      description: '신규 가입자에게 지급되는 무료 대여권',
      create: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`   ✅ 무료 대여권 생성: ${freeGoodsRef.id}`);

    // 유료 대여권 상품 생성
    const paidGoodsRef = await db.collection('goods').add({
      name: '컵 1개 대여권',
      price: 1000,
      type: 'paid',
      description: '컵 1개를 대여할 수 있는 대여권',
      create: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`   ✅ 유료 대여권 생성: ${paidGoodsRef.id}`);

    console.log('\n📊 4. constants 문서 생성...');

    // 상수 설정 생성
    await db.collection('settings').doc('constants').set({
      balance: 1000, // 보증금
      limit_days: 7, // 대여 기간 (일)
      return_score: 10, // 기한 내 반납 시 추가 점수
      return_score_days: 3, // 추가 점수를 받을 수 있는 기한 (일)
      create: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('   ✅ 상수 설정 완료');

    console.log('\n✨ Firestore 초기화 완료!\n');
    console.log('📌 다음 단계:');
    console.log('1. .env.production 파일 확인');
    console.log('   → VITE_DEVICE_SHOP_ID=test-cafe-01 (이미 설정됨)');
    console.log('\n2. Vercel 환경 변수 설정');
    console.log('   → VERCEL-ENV-VARS.txt 파일 참고\n');

  } catch (error) {
    console.error('\n❌ 오류 발생:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

// 실행
initializeFirestore();
