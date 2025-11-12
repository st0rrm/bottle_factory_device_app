const express = require('express');
const router = express.Router();
const { db, FieldValue } = require('../config/firebase');

/**
 * Get server date in KST (Korea Standard Time)
 * Returns year and month for statistics tracking
 */
function getServerDate() {
  const now = new Date();
  // Convert to KST (UTC+9)
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(now.getTime() + kstOffset);

  return {
    year: kstDate.getUTCFullYear(),
    month: kstDate.getUTCMonth() + 1 // 1-12
  };
}

/**
 * Add user collect reference
 * Creates a reference document in users/{uid}/collect subcollection
 */
async function addUserCollect(uid, collectHistoryId) {
  await db.collection('users').doc(uid).collection('collect').doc(collectHistoryId)
    .set({ create: FieldValue.serverTimestamp() });
}

/**
 * Add saved items to collect_history subcollection
 * Creates documents in collect_history/{id}/collect_items
 */
async function addSavedItems(collectId, items) {
  const batch = db.batch();

  for (const [itemId, quantity] of Object.entries(items)) {
    const docRef = db.collection('collect_history')
      .doc(collectId)
      .collection('collect_items')
      .doc(itemId);

    batch.set(docRef, {
      collectId,
      item_id: itemId,
      quantity
    });
  }

  await batch.commit();
}

/**
 * Update statistics in a given subcollection
 * Updates both "total" document and year-based monthly statistics
 * Statistics structure: { item_id: [total, Jan, Feb, ..., Dec] }
 */
async function addStatistics(statisticsRef, items) {
  const { year, month } = getServerDate();

  // Update "total" document
  const totalDocRef = statisticsRef.doc('total');
  const totalSnapshot = await totalDocRef.get();

  const totalUpdates = {};
  if (totalSnapshot.exists) {
    const existingData = totalSnapshot.data();
    for (const [itemId, count] of Object.entries(items)) {
      const prevCount = existingData[itemId] || 0;
      totalUpdates[itemId] = prevCount + count;
    }
    await totalDocRef.set({ ...existingData, ...totalUpdates });
  } else {
    // First time - just set the counts directly
    await totalDocRef.set(items);
  }

  // Update year document with monthly array
  const yearDocRef = statisticsRef.doc(year.toString());
  const yearSnapshot = await yearDocRef.get();

  const yearUpdates = {};
  if (yearSnapshot.exists) {
    const existingData = yearSnapshot.data();
    for (const [itemId, count] of Object.entries(items)) {
      let arr;
      if (existingData[itemId]) {
        // Copy existing array
        arr = [...existingData[itemId]];
      } else {
        // Create new array: [total, Jan, Feb, ..., Dec]
        arr = new Array(13).fill(0);
      }

      // Update the specific month
      arr[month] = arr[month] + count;
      // Update total (index 0)
      arr[0] = arr.slice(1).reduce((sum, val) => sum + val, 0);

      yearUpdates[itemId] = arr;
    }
    await yearDocRef.set({ ...existingData, ...yearUpdates });
  } else {
    // First time for this year
    for (const [itemId, count] of Object.entries(items)) {
      const arr = new Array(13).fill(0);
      arr[month] = count;
      arr[0] = count; // total
      yearUpdates[itemId] = arr;
    }
    await yearDocRef.set(yearUpdates);
  }
}

/**
 * POST /api/users/return-cup
 * Handle cup return and update all relevant collections and subcollections
 *
 * Request body:
 * {
 *   uid: string,              // User ID
 *   shopId: string,           // Shop ID where cups are returned
 *   items: { [itemId]: count }, // Items being returned { item_id: quantity }
 *   score: number,            // Score to award per cup
 * }
 */
router.post('/return-cup', async (req, res) => {
  try {
    const { uid, shopId, items, score } = req.body;

    // Validate required fields
    if (!uid || !shopId || !items || score === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: uid, shopId, items, score'
      });
    }

    // Calculate total count
    const totalCount = Object.values(items).reduce((sum, count) => sum + count, 0);

    if (totalCount === 0) {
      return res.status(400).json({ error: 'No items to return' });
    }

    // Calculate total score (score per cup * total cups)
    const totalScore = score * totalCount;

    // 1. Update user document (score, coin, saving_all)
    await db.collection('users').doc(uid).update({
      score: FieldValue.increment(totalScore),
      coin: FieldValue.increment(totalScore), // coin = score (동일하게 적립)
      saving_all: FieldValue.increment(totalCount)
    });

    // 2. Create collect_history document
    const collectHistoryRef = await db.collection('collect_history').add({
      uid,
      shop_id: shopId,
      score: totalScore,
      create: FieldValue.serverTimestamp()
    });

    const collectHistoryId = collectHistoryRef.id;

    // 3. Add collect_items subcollection to collect_history
    await addSavedItems(collectHistoryId, items);

    // 4. Add reference to users/{uid}/collect subcollection
    await addUserCollect(uid, collectHistoryId);

    // 5. Update users/{uid}/savings statistics
    const userSavingsRef = db.collection('users').doc(uid).collection('savings');
    await addStatistics(userSavingsRef, items);

    // 6. Update shops/{shopId}/savings statistics
    const shopSavingsRef = db.collection('shops').doc(shopId).collection('savings');
    await addStatistics(shopSavingsRef, items);

    // 7. Update global savings collection (optional, based on original app)
    const globalSavingsRef = db.collection('savings');
    await addStatistics(globalSavingsRef, items);

    res.json({
      success: true,
      message: 'Cup return processed successfully',
      data: {
        collectHistoryId,
        totalCount,
        totalScore,
        coinAwarded: totalScore
      }
    });

  } catch (error) {
    console.error('Cup return error:', error);
    res.status(500).json({
      error: 'Failed to process cup return',
      details: error.message
    });
  }
});

/**
 * GET /api/users/:uid
 * Get user information from Firebase
 */
router.get('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      uid,
      ...userDoc.data()
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      details: error.message
    });
  }
});

/**
 * POST /api/users/create
 * Create a new user (from phone verification)
 * Note: collect and savings subcollections are NOT created here.
 * They are created dynamically when the user returns their first cup.
 */
router.post('/create', async (req, res) => {
  try {
    const { uid, phone, name, address } = req.body;

    if (!uid || !phone) {
      return res.status(400).json({
        error: 'Missing required fields: uid, phone'
      });
    }

    // Check if user already exists
    const existingUser = await db.collection('users').doc(uid).get();
    if (existingUser.exists) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Create user document
    const userData = {
      uid,
      mobile: phone,
      name: name || `User${phone.slice(-4)}`, // Default name from last 4 digits
      role: 'user',
      terms: true,
      score: 0,
      coin: 0,
      bottle_all: 0,
      saving_all: 0,
      create: FieldValue.serverTimestamp(),
      update: FieldValue.serverTimestamp()
    };

    // Add address if provided
    if (address) {
      Object.assign(userData, {
        sido: address.sido,
        sgg: address.sgg,
        adm_cd2: address.h_code,
        dp_nm: address.dong_name,
        adm_nm: address.address_name,
        address: address
      });
    }

    await db.collection('users').doc(uid).set(userData);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      uid
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: 'Failed to create user',
      details: error.message
    });
  }
});

module.exports = router;
