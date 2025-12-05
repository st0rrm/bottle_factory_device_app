/**
 * Production Firebase (zero-club) 데이터 마이그레이션
 *
 * ⚠️ 이 스크립트는 원본 Firebase에 영향을 주지 않습니다 (읽기 전용)
 *
 * 복사 전략:
 * 1. 기준 데이터: 전체 복사
 * 2. Lawrence(01082367321, UID: 24NY90oNQaYltUed3MVn28xecHG2) 관련 데이터: 실제 데이터 복사
 * 3. 나머지 개인 데이터: 더미 데이터 생성
 */

const admin = require('firebase-admin');

// Production Firebase 초기화 (읽기 전용)
const prodServiceAccount = require('../../BOTTLEFACTORY/bottleclub-admin-main/firebase/production/zero-club-firebase-adminsdk-fip4x-496ebdf000.json');
const prodApp = admin.initializeApp({
  credential: admin.credential.cert(prodServiceAccount),
  databaseURL: "https://zero-club.firebaseio.com"
}, 'production');
const prodDb = prodApp.firestore();

// 새 Firebase 초기화 (쓰기용)
const newServiceAccount = require('./service-account.json');
const newApp = admin.initializeApp({
  credential: admin.credential.cert(newServiceAccount),
  projectId: "bottler-project1"
}, 'newFirebase');
const newDb = newApp.firestore();

const LAWRENCE_UID = '24NY90oNQaYltUed3MVn28xecHG2';

/**
 * Timestamp 변환
 */
function convertTimestamps(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const converted = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    const value = obj[key];
    if (value && typeof value.toDate === 'function') {
      converted[key] = admin.firestore.Timestamp.fromDate(value.toDate());
    } else if (value && typeof value === 'object') {
      converted[key] = convertTimestamps(value);
    } else {
      converted[key] = value;
    }
  }
  return converted;
}

/**
 * 컬렉션 전체 복사 (기준 데이터)
 */
async function copyCollection(collectionName) {
  console.log(`\n📋 ${collectionName} 복사 중...`);

  try {
    const snapshot = await prodDb.collection(collectionName).get();

    if (snapshot.empty) {
      console.log(`⚠️  ${collectionName}: 비어있음`);
      return 0;
    }

    let count = 0;
    // Firestore batch는 500개 제한이 있으므로 나눠서 처리
    const batchSize = 500;
    let batch = newDb.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const newDocRef = newDb.collection(collectionName).doc(doc.id);
      const convertedData = convertTimestamps(data);

      batch.set(newDocRef, convertedData);
      batchCount++;
      count++;

      if (batchCount >= batchSize) {
        await batch.commit();
        batch = newDb.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log(`✅ ${collectionName}: ${count}개 복사 완료`);
    return count;

  } catch (error) {
    console.error(`❌ ${collectionName} 복사 실패:`, error.message);
    return 0;
  }
}

/**
 * Lawrence 사용자와 관련된 데이터만 복사
 */
async function copyLawrenceData(collectionName, uidField = 'uid') {
  console.log(`\n👤 ${collectionName} - Lawrence 데이터 복사 중...`);

  try {
    const snapshot = await prodDb.collection(collectionName)
      .where(uidField, '==', LAWRENCE_UID)
      .get();

    if (snapshot.empty) {
      console.log(`⚠️  ${collectionName}: Lawrence 데이터 없음`);
      return 0;
    }

    const batch = newDb.batch();
    let count = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      const newDocRef = newDb.collection(collectionName).doc(doc.id);
      const convertedData = convertTimestamps(data);
      batch.set(newDocRef, convertedData);
      count++;
    });

    await batch.commit();
    console.log(`✅ ${collectionName}: Lawrence 데이터 ${count}개 복사 완료`);
    return count;

  } catch (error) {
    console.error(`❌ ${collectionName} Lawrence 데이터 복사 실패:`, error.message);
    return 0;
  }
}

/**
 * 더미 데이터 생성
 */
async function createDummyData(collectionName, count, generator) {
  console.log(`\n🎭 ${collectionName} - 더미 데이터 생성 중... (${count}개)`);

  try {
    const snapshot = await prodDb.collection(collectionName).limit(1).get();

    if (snapshot.empty) {
      console.log(`⚠️  ${collectionName}: 샘플 데이터 없음`);
      return 0;
    }

    const sample = snapshot.docs[0].data();
    const batch = newDb.batch();

    for (let i = 1; i <= count; i++) {
      const dummyId = `dummy_${collectionName}_${String(i).padStart(3, '0')}`;
      const dummyRef = newDb.collection(collectionName).doc(dummyId);
      const dummyData = generator(sample, i);
      batch.set(dummyRef, dummyData);
    }

    await batch.commit();
    console.log(`✅ ${collectionName}: 더미 ${count}개 생성 완료`);
    return count;

  } catch (error) {
    console.error(`❌ ${collectionName} 더미 생성 실패:`, error.message);
    return 0;
  }
}

/**
 * 더미 사용자 생성기
 */
function generateDummyUser(sample, index) {
  const names = ['김민준', '이서연', '박지우', '최하은', '정도윤', '강서준', '조수아', '윤예준', '장시우', '임지아'];
  const dongs = [
    { name: '연희동', h_code: '1144010700', sgg: '11440', adm_nm: '서울특별시 서대문구 연희동', sido: '11' },
    { name: '홍대동', h_code: '1146010100', sgg: '11460', adm_nm: '서울특별시 마포구 홍대동', sido: '11' },
    { name: '강남동', h_code: '1168010100', sgg: '11680', adm_nm: '서울특별시 강남구 강남동', sido: '11' }
  ];

  const name = names[index % names.length];
  const dong = dongs[index % dongs.length];

  return {
    uid: `dummy_user_${String(index).padStart(3, '0')}`,
    name: name,
    mobile: `010${String(10000000 + index).substring(0, 8)}`,
    role: 'user',
    terms: true,
    score: Math.floor(Math.random() * 100),
    coin: Math.floor(Math.random() * 50),
    bottle_all: Math.floor(Math.random() * 10),
    saving_all: Math.floor(Math.random() * 20),
    sido: dong.sido,
    sgg: dong.sgg,
    adm_cd2: dong.h_code,
    dp_nm: dong.name,
    adm_nm: dong.adm_nm,
    address: {
      address_name: dong.adm_nm,
      address_type: 'REGION',
      x: '127.0',
      y: '37.5',
      address: {
        region_1depth_name: '서울',
        region_2depth_name: dong.name.includes('서대문') ? '서대문구' : dong.name.includes('마포') ? '마포구' : '강남구',
        region_3depth_name: dong.name,
        h_code: dong.h_code
      }
    },
    create: admin.firestore.Timestamp.now(),
    update: admin.firestore.Timestamp.now(),
    ...(sample.group ? { group: { belong: [] } } : {}),
    ...(sample.chargePolicy !== undefined ? { chargePolicy: true } : {})
  };
}

/**
 * 범용 더미 생성기
 */
function generateGenericDummy(sample, index) {
  const dummy = {};

  for (const key in sample) {
    const value = sample[key];

    if (key === 'uid') {
      dummy[key] = `dummy_user_${String(Math.floor(Math.random() * 49) + 1).padStart(3, '0')}`;
    } else if (value && typeof value.toDate === 'function') {
      dummy[key] = admin.firestore.Timestamp.now();
    } else if (typeof value === 'number') {
      dummy[key] = Math.floor(Math.random() * 100);
    } else if (typeof value === 'string') {
      dummy[key] = `dummy_${key}_${index}`;
    } else if (typeof value === 'object' && value !== null) {
      dummy[key] = value;
    } else {
      dummy[key] = value;
    }
  }

  return dummy;
}

/**
 * 메인 마이그레이션
 */
async function migrate() {
  console.log('🔥 Production Firebase (zero-club) 마이그레이션 시작\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const stats = {
    realData: 0,
    lawrenceData: 0,
    dummyData: 0
  };

  // 1. 모든 컬렉션 목록 가져오기
  console.log('📊 컬렉션 목록 확인 중...\n');
  const collections = await prodDb.listCollections();
  const collectionNames = collections.map(c => c.id);
  console.log(`총 ${collectionNames.length}개 컬렉션 발견:`, collectionNames.join(', '));
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 2. 기준 데이터 컬렉션 (전체 복사)
  console.log('📦 기준 데이터 복사 중...');
  const baseCollections = ['items', 'shops', 'goods', 'constants', 'group', 'projects',
                           'free_coupon', 'zones', 'announcement', 'contents', 'hashtags',
                           'savings'];

  for (const name of baseCollections) {
    if (collectionNames.includes(name)) {
      const count = await copyCollection(name);
      stats.realData += count;
    }
  }

  // 3. Lawrence 사용자 데이터 복사
  console.log('\n\n👤 Lawrence 사용자 데이터 복사 중...');

  // Lawrence 사용자 문서
  const lawrenceDoc = await prodDb.collection('users').doc(LAWRENCE_UID).get();
  if (lawrenceDoc.exists) {
    await newDb.collection('users').doc(LAWRENCE_UID).set(convertTimestamps(lawrenceDoc.data()));
    console.log('✅ users: Lawrence 사용자 복사 완료');
    stats.lawrenceData += 1;
  }

  // Lawrence 관련 데이터
  const lawrenceCollections = [
    { name: 'rents', field: 'uid' },
    { name: 'goods_history', field: 'uid' },
    { name: 'projects_history', field: 'uid' },
    { name: 'collect_history', field: 'uid' },
    { name: 'balances', field: 'uid' },
    { name: 'cpoint_history', field: 'uid' },
    { name: 'donate_history', field: 'uid' }
  ];

  for (const { name, field } of lawrenceCollections) {
    if (collectionNames.includes(name)) {
      const count = await copyLawrenceData(name, field);
      stats.lawrenceData += count;
    }
  }

  // 4. 더미 데이터 생성
  console.log('\n\n🎭 더미 데이터 생성 중...');

  const dummyCount = await createDummyData('users', 49, generateDummyUser);
  stats.dummyData += dummyCount;

  const dummyCollections = [
    { name: 'rents', count: 20 },
    { name: 'goods_history', count: 30 },
    { name: 'collect_history', count: 25 },
    { name: 'auth', count: 15 },
    { name: 'balances', count: 20 },
    { name: 'donate', count: 5 },
    { name: 'files', count: 5 }
  ];

  for (const { name, count } of dummyCollections) {
    if (collectionNames.includes(name)) {
      const created = await createDummyData(name, count, generateGenericDummy);
      stats.dummyData += created;
    }
  }

  // 완료
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✨ 마이그레이션 완료!\n');
  console.log('📊 통계:');
  console.log(`   📦 실제 기준 데이터: ${stats.realData}개`);
  console.log(`   👤 Lawrence 데이터: ${stats.lawrenceData}개`);
  console.log(`   🎭 더미 데이터: ${stats.dummyData}개`);
  console.log(`   합계: ${stats.realData + stats.lawrenceData + stats.dummyData}개\n`);

  process.exit(0);
}

migrate().catch((error) => {
  console.error('❌ 마이그레이션 실패:', error);
  process.exit(1);
});
