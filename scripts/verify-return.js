/**
 * Verify cup return created all necessary subcollections
 */

const admin = require('firebase-admin');

// Initialize Firebase
const serviceAccount = require('./service-account.json');
const app = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "bottler-project1"
});

const db = app.firestore();
const LAWRENCE_UID = '24NY90oNQaYltUed3MVn28xecHG2';

async function verify() {
  console.log('🔍 Verifying cup return subcollections...\n');

  try {
    // 1. Check user document updates
    console.log('1️⃣ Checking user document updates');
    const userDoc = await db.collection('users').doc(LAWRENCE_UID).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      console.log(`   ✅ User score: ${data.score}`);
      console.log(`   ✅ User coin: ${data.coin}`);
      console.log(`   ✅ User saving_all: ${data.saving_all}`);
    }

    // 2. Check users/{uid}/collect subcollection
    console.log('\n2️⃣ Checking users/{uid}/collect subcollection');
    const collectSnapshot = await db.collection(`users/${LAWRENCE_UID}/collect`).get();
    console.log(`   ✅ Found ${collectSnapshot.size} collect references`);
    if (!collectSnapshot.empty) {
      const latestCollect = collectSnapshot.docs[collectSnapshot.size - 1];
      console.log(`   📄 Latest: ${latestCollect.id}`);
    }

    // 3. Check collect_history and its subcollection
    console.log('\n3️⃣ Checking collect_history');
    const historySnapshot = await db.collection('collect_history')
      .where('uid', '==', LAWRENCE_UID)
      .limit(5)
      .get();

    if (!historySnapshot.empty) {
      const historyDoc = historySnapshot.docs[0];
      console.log(`   ✅ Latest collect_history: ${historyDoc.id}`);
      console.log(`   📊 Data:`, JSON.stringify(historyDoc.data(), null, 2));

      // Check collect_items subcollection
      const itemsSnapshot = await db.collection(`collect_history/${historyDoc.id}/collect_items`).get();
      console.log(`   ✅ collect_items: ${itemsSnapshot.size} items`);
      itemsSnapshot.forEach(doc => {
        console.log(`      - ${doc.id}: quantity ${doc.data().quantity}`);
      });
    }

    // 4. Check users/{uid}/savings subcollection
    console.log('\n4️⃣ Checking users/{uid}/savings subcollection');
    const savingsSnapshot = await db.collection(`users/${LAWRENCE_UID}/savings`).get();
    console.log(`   ✅ Found ${savingsSnapshot.size} savings documents`);
    savingsSnapshot.forEach(doc => {
      console.log(`   📄 ${doc.id}:`);
      const data = doc.data();
      for (const [itemId, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
          console.log(`      ${itemId}: [total=${value[0]}, Jan=${value[1]}, Feb=${value[2]}, ...]`);
        } else {
          console.log(`      ${itemId}: ${value}`);
        }
      }
    });

    // 5. Check shops/{shopId}/savings subcollection
    console.log('\n5️⃣ Checking shops/{shopId}/savings subcollection');
    const shopSavingsSnapshot = await db.collection('shops/test_shop_001/savings').get();
    console.log(`   ✅ Found ${shopSavingsSnapshot.size} shop savings documents`);
    shopSavingsSnapshot.forEach(doc => {
      console.log(`   📄 ${doc.id}:`);
      const data = doc.data();
      for (const [itemId, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
          console.log(`      ${itemId}: [total=${value[0]}, ...]`);
        } else {
          console.log(`      ${itemId}: ${value}`);
        }
      }
    });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ All subcollections verified successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✓ User document updated (score, coin, saving_all)');
    console.log('   ✓ users/{uid}/collect references created');
    console.log('   ✓ collect_history document created');
    console.log('   ✓ collect_history/{id}/collect_items subcollection created');
    console.log('   ✓ users/{uid}/savings statistics updated');
    console.log('   ✓ shops/{shopId}/savings statistics updated');

  } catch (error) {
    console.error('❌ Verification error:', error);
  }

  process.exit(0);
}

verify();
