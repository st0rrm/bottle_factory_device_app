/**
 * Lawrence UID를 포함하는 모든 데이터 심층 검색
 * (서브컬렉션, 중첩 객체 포함)
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

/**
 * 객체 안에 UID가 있는지 재귀적으로 검색
 */
function containsUID(obj, uid) {
  if (!obj || typeof obj !== 'object') return false;

  for (const key in obj) {
    const value = obj[key];

    // 직접 매칭
    if (value === uid) return true;

    // 배열인 경우
    if (Array.isArray(value)) {
      if (value.includes(uid)) return true;
      for (const item of value) {
        if (containsUID(item, uid)) return true;
      }
    }

    // 객체인 경우 재귀
    if (typeof value === 'object' && value !== null) {
      if (containsUID(value, uid)) return true;
    }
  }

  return false;
}

/**
 * 서브컬렉션 재귀 검색
 */
async function searchSubcollections(docRef, path, results) {
  try {
    const subcollections = await docRef.listCollections();

    for (const subcollection of subcollections) {
      const subPath = `${path}/${subcollection.id}`;
      console.log(`   🔎 서브컬렉션: ${subPath}`);

      const snapshot = await subcollection.get();

      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (containsUID(data, LAWRENCE_UID)) {
          console.log(`      ✅ 발견: ${doc.id}`);
          results.push({
            path: `${subPath}/${doc.id}`,
            collectionPath: subPath,
            docId: doc.id,
            data: data
          });

          // 재귀적으로 더 깊은 서브컬렉션 검색
          await searchSubcollections(doc.ref, `${subPath}/${doc.id}`, results);
        }
      }
    }
  } catch (error) {
    console.error(`   ❌ 서브컬렉션 검색 실패: ${error.message}`);
  }
}

/**
 * 전체 컬렉션 심층 검색
 */
async function deepSearch() {
  console.log('🔍 Lawrence UID 심층 검색 시작\n');
  console.log(`UID: ${LAWRENCE_UID}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⚠️  경고: 전체 스캔이므로 시간이 오래 걸릴 수 있습니다.\n');

  const allResults = [];
  const stats = {
    collectionsSearched: 0,
    documentsFound: 0,
    byCollection: {}
  };

  // 모든 최상위 컬렉션 가져오기
  const collections = await prodDb.listCollections();

  for (const collectionRef of collections) {
    const collectionName = collectionRef.id;
    console.log(`\n📂 ${collectionName} 검색 중...`);
    stats.collectionsSearched++;

    const collectionResults = [];

    try {
      // 1. where 쿼리로 빠른 검색 시도
      let snapshot = await collectionRef.where('uid', '==', LAWRENCE_UID).get();

      if (!snapshot.empty) {
        console.log(`   ✅ uid 필드에서 ${snapshot.size}개 발견`);
        for (const doc of snapshot.docs) {
          collectionResults.push({
            path: `${collectionName}/${doc.id}`,
            collectionPath: collectionName,
            docId: doc.id,
            data: doc.data()
          });

          // 서브컬렉션 검색
          await searchSubcollections(doc.ref, `${collectionName}/${doc.id}`, collectionResults);
        }
      }

      // 2. user_id 필드로도 검색
      snapshot = await collectionRef.where('user_id', '==', LAWRENCE_UID).get();

      if (!snapshot.empty) {
        console.log(`   ✅ user_id 필드에서 ${snapshot.size}개 발견`);
        for (const doc of snapshot.docs) {
          // 중복 체크
          if (!collectionResults.find(r => r.docId === doc.id)) {
            collectionResults.push({
              path: `${collectionName}/${doc.id}`,
              collectionPath: collectionName,
              docId: doc.id,
              data: doc.data()
            });

            await searchSubcollections(doc.ref, `${collectionName}/${doc.id}`, collectionResults);
          }
        }
      }

      // 3. 전체 문서 스캔 (중첩 객체나 배열 안의 UID 검색)
      // 너무 많은 문서가 있는 컬렉션은 샘플만 검색
      const allDocs = await collectionRef.limit(1000).get();
      let deepSearchCount = 0;

      for (const doc of allDocs.docs) {
        // 이미 찾은 문서는 스킵
        if (collectionResults.find(r => r.docId === doc.id)) continue;

        const data = doc.data();
        if (containsUID(data, LAWRENCE_UID)) {
          deepSearchCount++;
          console.log(`   ✅ 중첩 객체에서 발견: ${doc.id}`);
          collectionResults.push({
            path: `${collectionName}/${doc.id}`,
            collectionPath: collectionName,
            docId: doc.id,
            data: data
          });

          await searchSubcollections(doc.ref, `${collectionName}/${doc.id}`, collectionResults);
        }
      }

      if (deepSearchCount > 0) {
        console.log(`   ✅ 심층 검색에서 ${deepSearchCount}개 추가 발견`);
      }

      if (collectionResults.length === 0) {
        console.log(`   ⚪ 데이터 없음`);
      } else {
        stats.byCollection[collectionName] = collectionResults.length;
        stats.documentsFound += collectionResults.length;
        allResults.push(...collectionResults);
      }

    } catch (error) {
      console.error(`   ❌ ${collectionName} 검색 실패:`, error.message);
    }
  }

  // 결과 출력 및 저장
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✨ 검색 완료!\n');
  console.log('📊 통계:');
  console.log(`   - 검색한 컬렉션: ${stats.collectionsSearched}개`);
  console.log(`   - 발견한 문서: ${stats.documentsFound}개\n`);

  if (stats.documentsFound > 0) {
    console.log('📂 컬렉션별:');
    for (const [collection, count] of Object.entries(stats.byCollection)) {
      console.log(`   - ${collection}: ${count}개`);
    }

    console.log('\n\n📄 발견된 모든 데이터:\n');

    // 새 Firebase로 복사
    for (const result of allResults) {
      console.log(`\n경로: ${result.path}`);
      console.log(JSON.stringify(result.data, null, 2));

      // 복사
      const pathParts = result.path.split('/');
      let docRef = newDb.collection(pathParts[0]);

      for (let i = 1; i < pathParts.length; i++) {
        if (i % 2 === 1) {
          docRef = docRef.doc(pathParts[i]);
        } else {
          docRef = docRef.collection(pathParts[i]);
        }
      }

      await docRef.set(convertTimestamps(result.data));
    }

    console.log('\n\n💾 모든 데이터가 bottler-project1로 복사되었습니다.');
  }

  process.exit(0);
}

deepSearch().catch((error) => {
  console.error('❌ 검색 실패:', error);
  process.exit(1);
});
