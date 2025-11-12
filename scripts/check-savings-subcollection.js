/**
 * 원본 Firebase에서 users/{uid}/savings 서브컬렉션 확인
 */

const admin = require('firebase-admin');

// Production Firebase 초기화
const prodServiceAccount = require('../../BOTTLEFACTORY/bottleclub-admin-main/firebase/production/zero-club-firebase-adminsdk-fip4x-496ebdf000.json');
const prodApp = admin.initializeApp({
  credential: admin.credential.cert(prodServiceAccount),
  databaseURL: "https://zero-club.firebaseio.com"
}, 'production');
const prodDb = prodApp.firestore();

const LAWRENCE_UID = '24NY90oNQaYltUed3MVn28xecHG2';

async function checkSavings() {
  console.log('🔍 원본 Firebase (linkwithexpo/zero-club)에서 savings 서브컬렉션 확인 중...\n');

  try {
    // 1. Lawrence 사용자 확인
    console.log('1️⃣ Lawrence 사용자 확인');
    const lawrenceDoc = await prodDb.collection('users').doc(LAWRENCE_UID).get();

    if (!lawrenceDoc.exists) {
      console.log('❌ Lawrence 사용자 문서가 없습니다.');
      process.exit(1);
    }

    console.log('✅ Lawrence 사용자 존재:', lawrenceDoc.data().name || 'Lawrence');

    // 2. Lawrence의 서브컬렉션 목록 확인
    console.log('\n2️⃣ Lawrence의 서브컬렉션 확인');
    const subcollections = await lawrenceDoc.ref.listCollections();

    if (subcollections.length === 0) {
      console.log('⚠️  서브컬렉션이 없습니다.');
    } else {
      console.log(`📂 서브컬렉션 ${subcollections.length}개 발견:`);
      subcollections.forEach(col => {
        console.log(`   - ${col.id}`);
      });
    }

    // 3. savings 서브컬렉션 상세 확인
    console.log('\n3️⃣ savings 서브컬렉션 상세 확인');
    const savingsRef = prodDb.collection(`users/${LAWRENCE_UID}/savings`);
    const savingsSnapshot = await savingsRef.get();

    if (savingsSnapshot.empty) {
      console.log('❌ savings 서브컬렉션이 비어있거나 존재하지 않습니다.');
    } else {
      console.log(`✅ savings 문서 ${savingsSnapshot.size}개 발견:\n`);

      savingsSnapshot.forEach(doc => {
        console.log(`   📄 ${doc.id}:`);
        const data = doc.data();
        console.log(JSON.stringify(data, null, 6));
        console.log('');
      });
    }

    // 4. 다른 몇 명의 사용자도 샘플 확인
    console.log('\n4️⃣ 다른 사용자들의 savings 서브컬렉션 샘플 확인 (최대 5명)');
    const usersSnapshot = await prodDb.collection('users').limit(5).get();

    let usersWithSavings = 0;
    let usersWithoutSavings = 0;

    for (const userDoc of usersSnapshot.docs) {
      const savingsSnap = await prodDb.collection(`users/${userDoc.id}/savings`).get();

      if (!savingsSnap.empty) {
        usersWithSavings++;
        console.log(`   ✅ ${userDoc.id} (${userDoc.data().name || 'N/A'}): ${savingsSnap.size}개 문서`);
      } else {
        usersWithoutSavings++;
        console.log(`   ⚪ ${userDoc.id} (${userDoc.data().name || 'N/A'}): savings 없음`);
      }
    }

    console.log(`\n   통계: savings 있음 ${usersWithSavings}명, 없음 ${usersWithoutSavings}명`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n결론:');

    if (savingsSnapshot.empty) {
      console.log('❌ 원본 Firebase에도 savings 서브컬렉션이 없거나,');
      console.log('   Lawrence 사용자에게 활동 기록이 없습니다.');
      console.log('   → 정상적인 상황일 수 있습니다.');
    } else {
      console.log('✅ 원본 Firebase에 savings 서브컬렉션이 존재합니다!');
      console.log('   → 마이그레이션 스크립트가 서브컬렉션을 복사하지 않았습니다.');
      console.log('   → 서브컬렉션 복사 기능을 추가해야 합니다.');
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }

  process.exit(0);
}

checkSavings();
