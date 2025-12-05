/**
 * Lawrence (UID: 24NY90oNQaYltUed3MVn28xecHG2) 관련 모든 데이터 추출
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

async function extractAllData() {
  console.log('🔍 Lawrence 관련 모든 데이터 추출 시작\n');
  console.log(`UID: ${LAWRENCE_UID}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const stats = {
    total: 0,
    byCollection: {}
  };

  // 모든 컬렉션 가져오기
  const collections = await prodDb.listCollections();

  for (const collectionRef of collections) {
    const collectionName = collectionRef.id;
    console.log(`\n📂 ${collectionName} 검색 중...`);

    try {
      // uid 필드로 검색
      let snapshot = await collectionRef.where('uid', '==', LAWRENCE_UID).get();

      if (snapshot.empty) {
        // user_id 필드로도 시도
        snapshot = await collectionRef.where('user_id', '==', LAWRENCE_UID).get();
      }

      if (!snapshot.empty) {
        const count = snapshot.size;
        console.log(`✅ ${collectionName}: ${count}개 발견`);

        // 새 Firebase로 복사
        const batch = newDb.batch();
        snapshot.forEach(doc => {
          const newDocRef = newDb.collection(collectionName).doc(doc.id);
          const convertedData = convertTimestamps(doc.data());
          batch.set(newDocRef, convertedData);
        });
        await batch.commit();

        // 데이터 출력
        snapshot.forEach(doc => {
          console.log(`   📄 문서 ID: ${doc.id}`);
          console.log(`   데이터:`, JSON.stringify(doc.data(), null, 2));
        });

        stats.byCollection[collectionName] = count;
        stats.total += count;
      } else {
        console.log(`⚪ ${collectionName}: 데이터 없음`);
      }
    } catch (error) {
      console.error(`❌ ${collectionName} 검색 실패:`, error.message);
    }
  }

  // users 컬렉션의 문서 직접 확인
  console.log(`\n\n👤 users 컬렉션 직접 확인...`);
  try {
    const userDoc = await prodDb.collection('users').doc(LAWRENCE_UID).get();
    if (userDoc.exists) {
      console.log(`✅ users: Lawrence 사용자 발견`);
      console.log(`   데이터:`, JSON.stringify(userDoc.data(), null, 2));

      // 새 Firebase로 복사
      await newDb.collection('users').doc(LAWRENCE_UID).set(convertTimestamps(userDoc.data()));

      if (!stats.byCollection['users']) {
        stats.byCollection['users'] = 1;
        stats.total += 1;
      }
    }
  } catch (error) {
    console.error(`❌ users 확인 실패:`, error.message);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✨ 추출 완료!\n');
  console.log('📊 통계:');
  console.log(`   총 ${stats.total}개 데이터\n`);
  console.log('📂 컬렉션별:');
  for (const [collection, count] of Object.entries(stats.byCollection)) {
    console.log(`   - ${collection}: ${count}개`);
  }
  console.log('\n💾 모든 데이터가 bottler-project1로 복사되었습니다.\n');

  process.exit(0);
}

extractAllData().catch((error) => {
  console.error('❌ 추출 실패:', error);
  process.exit(1);
});
