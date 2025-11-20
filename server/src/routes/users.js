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
 * POST /api/users/rental
 * Handle cup rental and update all relevant collections
 *
 * Request body:
 * {
 *   uid: string,              // User ID
 *   tickets: [{ id, amount }], // Tickets to use for rental
 *   shopId: string,           // Shop ID where cups are rented
 *   shopName: string          // Shop name
 * }
 */
router.post('/rental', async (req, res) => {
  try {
    const { uid, tickets, shopId, shopName } = req.body;

    // Validate required fields
    if (!uid || !tickets || !shopId || !shopName) {
      return res.status(400).json({
        error: 'Missing required fields: uid, tickets, shopId, shopName'
      });
    }

    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({ error: 'No tickets provided' });
    }

    const rentalCount = tickets.length;
    const rentalIds = [];

    // Get shop division
    const shopDoc = await db.collection('shops').doc(shopId).get();
    const shopDivision = shopDoc.exists && shopDoc.data().division
      ? shopDoc.data().division
      : 'individual';

    // Calculate expired_date (14 days from now)
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() + 14);

    // Process each ticket
    for (const ticket of tickets) {
      // 1. Update balance status: 'charge' → 'rent'
      await db.collection('balances').doc(ticket.id).update({
        status: 'rent',
        update: FieldValue.serverTimestamp()
      });

      // 2. Create rent document
      const rentalData = {
        uid,
        rented_date: FieldValue.serverTimestamp(),
        expired_date: expiredDate,
        rented_shop_id: shopId,
        rented_shop: shopName,
        status: 'rent',
        balance_id: ticket.id,
        amount: ticket.amount || 4000,
        division: shopDivision
      };

      const rentRef = await db.collection('rents').add(rentalData);
      rentalIds.push(rentRef.id);
    }

    // 3. Update user stats (bottle_all, saving_all)
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();
    await db.collection('users').doc(uid).update({
      bottle_all: userData.bottle_all + rentalCount,
      saving_all: userData.saving_all + rentalCount
    });

    res.json({
      success: true,
      message: 'Cup rental processed successfully',
      data: {
        rentalIds,
        count: rentalCount
      }
    });

  } catch (error) {
    console.error('Cup rental error:', error);
    res.status(500).json({
      error: 'Failed to process cup rental',
      details: error.message
    });
  }
});

/**
 * POST /api/users/return
 * Handle full cup return process (rents, balances, and scoring)
 *
 * Request body:
 * {
 *   uid: string,              // User ID
 *   rentals: [{ id }],        // Rental documents to return
 *   shopId: string,           // Shop ID where cups are returned
 *   shopName: string          // Shop name
 * }
 */
router.post('/return', async (req, res) => {
  try {
    const { uid, rentals, shopId, shopName } = req.body;

    // Validate required fields
    if (!uid || !rentals || !shopId || !shopName) {
      return res.status(400).json({
        error: 'Missing required fields: uid, rentals, shopId, shopName'
      });
    }

    if (!Array.isArray(rentals) || rentals.length === 0) {
      return res.status(400).json({ error: 'No rentals provided' });
    }

    const returnCount = rentals.length;
    const RETURNMECUP_ITEM_ID = 'AESpVawGP202Tg4QOmvH';
    const scorePerCup = 30;

    // 1. Update rents documents: status 'rent' → 'return'
    for (const rental of rentals) {
      await db.collection('rents').doc(rental.id).update({
        status: 'return',
        returned_date: FieldValue.serverTimestamp(),
        returned_shop_id: shopId,
        returned_shop: shopName
      });
    }

    // 2. Restore balances: find 'rent' status balances and restore to 'charge'
    const balancesSnapshot = await db.collection('balances')
      .where('user_id', '==', uid)
      .where('status', '==', 'rent')
      .get();

    let restoredCount = 0;
    for (const docSnap of balancesSnapshot.docs) {
      if (restoredCount >= returnCount) break;

      await db.collection('balances').doc(docSnap.id).update({
        status: 'charge',
        update: FieldValue.serverTimestamp()
      });
      restoredCount++;
    }

    // 3. Process scoring and savings (using existing logic)
    const totalScore = scorePerCup * returnCount;

    // Update user document (score, coin)
    await db.collection('users').doc(uid).update({
      score: FieldValue.increment(totalScore),
      coin: FieldValue.increment(totalScore)
    });

    // Create collect_history document
    const collectHistoryRef = await db.collection('collect_history').add({
      uid,
      shop_id: shopId,
      score: totalScore,
      create: FieldValue.serverTimestamp()
    });

    const collectHistoryId = collectHistoryRef.id;

    // Add collect_items subcollection
    const items = { [RETURNMECUP_ITEM_ID]: returnCount };
    await addSavedItems(collectHistoryId, items);

    // Add reference to users/{uid}/collect subcollection
    await addUserCollect(uid, collectHistoryId);

    // Update statistics: users/{uid}/savings
    const userSavingsRef = db.collection('users').doc(uid).collection('savings');
    await addStatistics(userSavingsRef, items);

    // Update statistics: shops/{shopId}/savings
    const shopSavingsRef = db.collection('shops').doc(shopId).collection('savings');
    await addStatistics(shopSavingsRef, items);

    // Update global savings collection
    const globalSavingsRef = db.collection('savings');
    await addStatistics(globalSavingsRef, items);

    res.json({
      success: true,
      message: 'Cup return processed successfully',
      data: {
        returnCount,
        restoredCount,
        totalScore,
        collectHistoryId
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
 * POST /api/users/do-actions
 * Handle zero-waste actions and update Firestore
 *
 * Request body:
 * {
 *   uid: string,              // User ID
 *   shopId: string,           // Shop ID where actions were performed
 *   items: { [itemId]: count }, // Items { item_id: quantity }
 * }
 */
router.post('/do-actions', async (req, res) => {
  try {
    const { uid, shopId, items } = req.body;

    // Validate required fields
    if (!uid || !shopId || !items) {
      return res.status(400).json({
        error: 'Missing required fields: uid, shopId, items'
      });
    }

    // Calculate total score based on item counts
    const itemScores = {
      'AESpVawGP202Tg4QOmvH': 30, // 텀블러
      'hjzsUXGds7dcqJyQYQzr': 30, // 다회용기
      'r6V568cm0yGwDfQ8vooW': 30, // 리필용기
      'VjlasSJRJjC6cw8BItvS': 5,  // 자원순환
    };

    let totalScore = 0;
    for (const [itemId, count] of Object.entries(items)) {
      const scorePerItem = itemScores[itemId] || 30; // Default 30 if not found
      totalScore += scorePerItem * count;
    }

    const totalCount = Object.values(items).reduce((sum, count) => sum + count, 0);

    if (totalCount === 0) {
      return res.status(400).json({ error: 'No items to record' });
    }

    // 1. Update user document (score, coin)
    await db.collection('users').doc(uid).update({
      score: FieldValue.increment(totalScore),
      coin: FieldValue.increment(totalScore)
    });

    // 2. Create individual collect_history documents for each action
    const collectHistoryIds = [];

    for (const [itemId, count] of Object.entries(items)) {
      const scorePerItem = itemScores[itemId] || 30;

      // Create one collect_history per item count
      for (let i = 0; i < count; i++) {
        const collectHistoryRef = await db.collection('collect_history').add({
          uid,
          shop_id: shopId,
          score: scorePerItem,
          create: FieldValue.serverTimestamp()
        });

        const collectHistoryId = collectHistoryRef.id;
        collectHistoryIds.push(collectHistoryId);

        // Add collect_items subcollection (single item per history)
        await addSavedItems(collectHistoryId, { [itemId]: 1 });

        // Add reference to users/{uid}/collect subcollection
        await addUserCollect(uid, collectHistoryId);
      }
    }

    // 3. Update users/{uid}/savings statistics (aggregate all items)
    const userSavingsRef = db.collection('users').doc(uid).collection('savings');
    await addStatistics(userSavingsRef, items);

    // 4. Update shops/{shopId}/savings statistics (aggregate all items)
    const shopSavingsRef = db.collection('shops').doc(shopId).collection('savings');
    await addStatistics(shopSavingsRef, items);

    // 5. Update global savings collection (aggregate all items)
    const globalSavingsRef = db.collection('savings');
    await addStatistics(globalSavingsRef, items);

    res.json({
      success: true,
      message: 'Do actions recorded successfully',
      data: {
        collectHistoryIds,
        totalCount,
        totalScore
      }
    });

  } catch (error) {
    console.error('Do actions error:', error);
    res.status(500).json({
      error: 'Failed to record do actions',
      details: error.message
    });
  }
});

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

    // 1. Update user document (score, coin)
    await db.collection('users').doc(uid).update({
      score: FieldValue.increment(totalScore),
      coin: FieldValue.increment(totalScore) // coin = score (동일하게 적립)
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
 * GET /api/users/phone/:phone
 * Get user by phone number
 */
router.get('/phone/:phone', async (req, res) => {
  try {
    const { phone } = req.params;

    // Query users by mobile field
    const usersSnapshot = await db.collection('users')
      .where('mobile', '==', phone)
      .get();

    if (usersSnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return first user (phone should be unique)
    const userDoc = usersSnapshot.docs[0];
    res.json({
      uid: userDoc.id,
      ...userDoc.data()
    });

  } catch (error) {
    console.error('Get user by phone error:', error);
    res.status(500).json({
      error: 'Failed to get user by phone',
      details: error.message
    });
  }
});

/**
 * GET /api/users/:uid/tickets
 * Get user's available tickets (balances)
 */
router.get('/:uid/tickets', async (req, res) => {
  try {
    const { uid } = req.params;

    // Get all balances for user
    const allBalancesSnapshot = await db.collection('balances')
      .where('user_id', '==', uid)
      .get();
    const totalCount = allBalancesSnapshot.size;

    // Get available tickets (status === 'charge')
    const balancesSnapshot = await db.collection('balances')
      .where('user_id', '==', uid)
      .where('status', '==', 'charge')
      .get();

    const tickets = [];
    balancesSnapshot.forEach(doc => {
      const data = doc.data();

      // Skip group tickets (group_id가 있는 대여권 제외)
      if (data.group_id) {
        return; // skip this ticket
      }

      // Determine ticket name
      let ticketName = '컵 1개 대여권';
      if (data.pgcode === 'bottleclub') {
        ticketName = '무료 대여권';
      }

      tickets.push({
        id: doc.id,
        type: 'balance',
        name: ticketName,
        pgcode: data.pgcode,
        status: data.status,
        transaction_date: data.transaction_date,
        amount: data.amount
      });
    });

    // Sort by transaction_date (FIFO - oldest first)
    tickets.sort((a, b) => {
      if (!a.transaction_date || !b.transaction_date) return 0;
      return a.transaction_date.localeCompare(b.transaction_date);
    });

    res.json({
      tickets,
      availableCount: tickets.length,
      totalCount
    });

  } catch (error) {
    console.error('Get user tickets error:', error);
    res.status(500).json({
      error: 'Failed to get user tickets',
      details: error.message
    });
  }
});

/**
 * GET /api/users/:uid/rentals?shopId=xxx
 * Get user's active rentals (currently rented cups)
 */
router.get('/:uid/rentals', async (req, res) => {
  try {
    const { uid } = req.params;
    const { shopId } = req.query;

    if (!shopId) {
      return res.status(400).json({ error: 'shopId is required' });
    }

    // Get shop division
    const shopDoc = await db.collection('shops').doc(shopId).get();
    const currentShopDivision = shopDoc.exists && shopDoc.data().division
      ? shopDoc.data().division
      : 'individual';

    // Get all active rentals for user (status === 'rent')
    const rentsSnapshot = await db.collection('rents')
      .where('uid', '==', uid)
      .where('status', '==', 'rent')
      .get();

    const rentals = [];
    rentsSnapshot.forEach(doc => {
      const data = doc.data();

      // Skip group rentals (group_id가 있는 대여 제외)
      if (data.group_id) {
        return; // skip this rental
      }

      // Check return eligibility
      if (data.division === 'individual') {
        // individual: can only return at the same shop
        if (data.rented_shop_id !== shopId) {
          return; // skip
        }
      } else if (data.division !== currentShopDivision) {
        // cluster: can only return at same division shops
        return; // skip
      }

      rentals.push({
        id: doc.id,
        ...data
      });
    });

    // Sort by rented_date (oldest first)
    rentals.sort((a, b) => {
      if (!a.rented_date || !b.rented_date) return 0;
      const dateA = a.rented_date.toDate ? a.rented_date.toDate() : new Date(a.rented_date);
      const dateB = b.rented_date.toDate ? b.rented_date.toDate() : new Date(b.rented_date);
      return dateA - dateB;
    });

    res.json({
      success: true,
      rentals
    });

  } catch (error) {
    console.error('Get user rentals error:', error);
    res.status(500).json({
      error: 'Failed to get user rentals',
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
