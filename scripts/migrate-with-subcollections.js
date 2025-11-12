/**
 * 서브컬렉션까지 포함한 완전한 마이그레이션
 *
 * 전략:
 * 1. 기준 데이터: 서브컬렉션까지 전체 복사
 * 2. Lawrence 데이터: 서브컬렉션까지 완전 복사
 * 3. 나머지: 더미 데이터 생성
 */

const admin = require('firebase-admin');

// Production Firebase 초기화
const prodServiceAccount = require('../../BOTTLEFACTORY/bottleclub-admin-main/firebase/production/zero-club-firebase-adminsdk-fip4x-496ebdf000.json');
const prodApp = admin.initializeApp({
  credential: admin.credential.cert(prodServiceAccount),
  databaseURL: "https://zero-club.firebaseio.com"
}, 'production');
const prodDb = prodApp.firestore();

// 새 Firebase 초기화
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
 * 서브컬렉션 재귀 복사
 */
async function copySubcollections(sourceDocRef, targetDocRef, path, stats) {
  try {
    const subcollections = await sourceDocRef.listCollections();

    for (const sourceSubcol of subcollections) {
      const subcolName = sourceSubcol.id;
      const subcolPath = `${path}/${subcolName}`;

      console.log(`      📦 서브컬렉션: ${subcolPath}`);

      const snapshot = await sourceSubcol.get();
      let subcolCount = 0;

      for (const subDoc of snapshot.docs) {
        const subDocData = subDoc.data();
        const targetSubDocRef = targetDocRef.collection(subcolName).doc(subDoc.id);

        // 문서 복사
        await targetSubDocRef.set(convertTimestamps(subDocData));
        subcolCount++;
        stats.subcollectionDocs++;

        // 재귀적으로 더 깊은 서브컬렉션 복사
        await copySubcollections(subDoc.ref, targetSubDocRef, `${subcolPath}/${subDoc.id}`, stats);
      }

      if (subcolCount > 0) {
        console.log(`         ✅ ${subcolCount}개 문서 복사`);
      }
    }
  } catch (error) {
    console.error(`      ❌ 서브컬렉션 복사 실패 (${path}):`, error.message);
  }
}

/**
 * 컬렉션 전체 복사 (서브컬렉션 포함)
 */
async function copyCollectionWithSubcollections(collectionName, stats) {
  console.log(`\n📋 ${collectionName} 복사 중 (서브컬렉션 포함)...`);

  try {
    const snapshot = await prodDb.collection(collectionName).get();

    if (snapshot.empty) {
      console.log(`   ⚠️  비어있음`);
      return 0;
    }

    let count = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const targetDocRef = newDb.collection(collectionName).doc(doc.id);

      // 문서 복사
      await targetDocRef.set(convertTimestamps(data));
      count++;

      // 서브컬렉션 복사
      await copySubcollections(doc.ref, targetDocRef, `${collectionName}/${doc.id}`, stats);

      // 진행상황 표시
      if (count % 10 === 0) {
        console.log(`   진행: ${count}/${snapshot.size}`);
      }
    }

    console.log(`   ✅ ${collectionName}: ${count}개 문서 복사 완료`);
    return count;

  } catch (error) {
    console.error(`   ❌ ${collectionName} 복사 실패:`, error.message);
    return 0;
  }
}

/**
 * Lawrence 관련 데이터 복사 (서브컬렉션 포함)
 */
async function copyLawrenceWithSubcollections(collectionName, uidField, stats) {
  console.log(`\n👤 ${collectionName} - Lawrence 데이터 복사 중 (서브컬렉션 포함)...`);

  try {
    const snapshot = await prodDb.collection(collectionName)
      .where(uidField, '==', LAWRENCE_UID)
      .get();

    if (snapshot.empty) {
      console.log(`   ⚠️  Lawrence 데이터 없음`);
      return 0;
    }

    let count = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const targetDocRef = newDb.collection(collectionName).doc(doc.id);

      // 문서 복사
      await targetDocRef.set(convertTimestamps(data));
      count++;

      // 서브컬렉션 복사
      await copySubcollections(doc.ref, targetDocRef, `${collectionName}/${doc.id}`, stats);
    }

    console.log(`   ✅ ${collectionName}: Lawrence 데이터 ${count}개 복사 완료`);
    return count;

  } catch (error) {
    console.error(`   ❌ ${collectionName} Lawrence 복사 실패:`, error.message);
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
 * 더미 데이터 생성
 */
async function createDummyData(collectionName, count, generator) {
  console.log(`\n🎭 ${collectionName} - 더미 데이터 생성 중... (${count}개)`);

  try {
    const snapshot = await prodDb.collection(collectionName).limit(1).get();

    if (snapshot.empty) {
      console.log(`   ⚠️  샘플 데이터 없음`);
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
    console.log(`   ✅ ${collectionName}: 더미 ${count}개 생성 완료`);
    return count;

  } catch (error) {
    console.error(`   ❌ ${collectionName} 더미 생성 실패:`, error.message);
    return 0;
  }
}

/**
 * 메인 마이그레이션
 */
async function migrate() {
  console.log('🔥 서브컬렉션 포함 완전 마이그레이션 시작\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const stats = {
    realData: 0,
    lawrenceData: 0,
    dummyData: 0,
    subcollectionDocs: 0
  };

  // 1. 기준 데이터 컬렉션 (서브컬렉션 포함 전체 복사)
  console.log('📦 기준 데이터 복사 중 (서브컬렉션 포함)...');
  const baseCollections = [
    'items',
    'shops',        // shops/{id}/files, hashtags, items, reviews, savings
    'goods',        // goods/{id}/files
    'constants',
    'group',
    'projects',
    'free_coupon',
    'zones',
    'announcement',
    'contents',
    'hashtags',
    'savings',      // 최상위 savings (통계용)
    'donate'        // donate/{id}/files
  ];

  for (const name of baseCollections) {
    const count = await copyCollectionWithSubcollections(name, stats);
    stats.realData += count;
  }

  // 2. Lawrence 사용자 데이터 복사 (서브컬렉션 포함)
  console.log('\n\n👤 Lawrence 사용자 데이터 복사 중 (서브컬렉션 포함)...');

  // Lawrence 사용자 문서 + 서브컬렉션
  console.log('\n👤 users - Lawrence 복사 중...');
  const lawrenceDoc = await prodDb.collection('users').doc(LAWRENCE_UID).get();
  if (lawrenceDoc.exists) {
    const targetDocRef = newDb.collection('users').doc(LAWRENCE_UID);
    await targetDocRef.set(convertTimestamps(lawrenceDoc.data()));
    console.log('   ✅ Lawrence 사용자 문서 복사');

    // 서브컬렉션 복사 (collect, savings)
    await copySubcollections(lawrenceDoc.ref, targetDocRef, `users/${LAWRENCE_UID}`, stats);
    stats.lawrenceData += 1;
  }

  // Lawrence 관련 데이터 (서브컬렉션 포함)
  const lawrenceCollections = [
    { name: 'rents', field: 'uid' },
    { name: 'goods_history', field: 'uid' },
    { name: 'projects_history', field: 'uid' },
    { name: 'collect_history', field: 'uid' },  // collect_history/{id}/collect_items
    { name: 'balances', field: 'user_id' },
    { name: 'cpoint_history', field: 'uid' },
    { name: 'donate_history', field: 'uid' }
  ];

  for (const { name, field } of lawrenceCollections) {
    const count = await copyLawrenceWithSubcollections(name, field, stats);
    stats.lawrenceData += count;
  }

  // 3. 더미 데이터 생성
  console.log('\n\n🎭 더미 데이터 생성 중...');

  const dummyCount = await createDummyData('users', 49, generateDummyUser);
  stats.dummyData += dummyCount;

  // 완료
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✨ 마이그레이션 완료!\n');
  console.log('📊 통계:');
  console.log(`   📦 실제 기준 데이터: ${stats.realData}개`);
  console.log(`   👤 Lawrence 데이터: ${stats.lawrenceData}개`);
  console.log(`   🎭 더미 데이터: ${stats.dummyData}개`);
  console.log(`   📦 서브컬렉션 문서: ${stats.subcollectionDocs}개`);
  console.log(`   합계: ${stats.realData + stats.lawrenceData + stats.dummyData + stats.subcollectionDocs}개\n`);

  process.exit(0);
}

migrate().catch((error) => {
  console.error('❌ 마이그레이션 실패:', error);
  process.exit(1);
});
