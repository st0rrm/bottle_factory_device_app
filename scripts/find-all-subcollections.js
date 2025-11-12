/**
 * 원본 Firebase의 모든 서브컬렉션 구조 스캔
 */

const admin = require('firebase-admin');

// Production Firebase 초기화
const prodServiceAccount = require('../../BOTTLEFACTORY/bottleclub-admin-main/firebase/production/zero-club-firebase-adminsdk-fip4x-496ebdf000.json');
const prodApp = admin.initializeApp({
  credential: admin.credential.cert(prodServiceAccount),
  databaseURL: "https://zero-club.firebaseio.com"
}, 'production');
const prodDb = prodApp.firestore();

async function findAllSubcollections() {
  console.log('🔍 원본 Firebase의 전체 서브컬렉션 구조 스캔 중...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const subcollectionMap = {};

  // 모든 최상위 컬렉션 가져오기
  const topLevelCollections = await prodDb.listCollections();

  console.log(`📂 최상위 컬렉션 ${topLevelCollections.length}개:\n`);

  for (const collectionRef of topLevelCollections) {
    const collectionName = collectionRef.id;
    console.log(`\n📁 ${collectionName}`);

    try {
      // 각 컬렉션에서 샘플 문서 3개 가져오기
      const snapshot = await collectionRef.limit(3).get();

      if (snapshot.empty) {
        console.log('   ⚪ 비어있음');
        continue;
      }

      const subcollectionsFound = new Set();

      for (const doc of snapshot.docs) {
        // 각 문서의 서브컬렉션 확인
        const subcollections = await doc.ref.listCollections();

        if (subcollections.length > 0) {
          for (const subcol of subcollections) {
            subcollectionsFound.add(subcol.id);
          }
        }
      }

      if (subcollectionsFound.size > 0) {
        console.log(`   📦 서브컬렉션 발견: ${Array.from(subcollectionsFound).join(', ')}`);
        subcollectionMap[collectionName] = Array.from(subcollectionsFound);

        // 각 서브컬렉션의 샘플 데이터 확인
        const firstDoc = snapshot.docs[0];
        for (const subcolName of subcollectionsFound) {
          const subcolSnapshot = await prodDb.collection(`${collectionName}/${firstDoc.id}/${subcolName}`).limit(1).get();
          if (!subcolSnapshot.empty) {
            const sampleData = subcolSnapshot.docs[0].data();
            console.log(`      └─ ${subcolName}/ 샘플:`, Object.keys(sampleData).slice(0, 5).join(', '));
          }
        }
      } else {
        console.log('   ⚪ 서브컬렉션 없음');
      }

    } catch (error) {
      console.error(`   ❌ 오류: ${error.message}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📊 서브컬렉션 요약:\n');

  if (Object.keys(subcollectionMap).length === 0) {
    console.log('⚪ 서브컬렉션이 발견되지 않았습니다.');
  } else {
    for (const [collection, subcollections] of Object.entries(subcollectionMap)) {
      console.log(`${collection}/`);
      for (const subcol of subcollections) {
        console.log(`   └─ {docId}/${subcol}/`);
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n⚠️  복사 필요 여부:\n');
    console.log('✅ 마이그레이션 스크립트를 수정하여 다음 서브컬렉션들을 복사해야 합니다:');
    for (const [collection, subcollections] of Object.entries(subcollectionMap)) {
      console.log(`   - ${collection}/ 의 서브컬렉션: ${subcollections.join(', ')}`);
    }
  }

  process.exit(0);
}

findAllSubcollections().catch((error) => {
  console.error('❌ 오류:', error);
  process.exit(1);
});
