const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin SDK
let credential;

// Check if FIREBASE_SERVICE_ACCOUNT environment variable is set (for production)
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    credential = admin.credential.cert(serviceAccount);
    console.log('✅ Firebase initialized with environment variable');
  } catch (error) {
    console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:', error);
    throw error;
  }
} else {
  // Use local file for development
  const serviceAccountPath = path.join(__dirname, '../../../scripts/service-account.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    credential = admin.credential.cert(serviceAccount);
    console.log('✅ Firebase initialized with local service account file');
  } else {
    console.error('❌ No Firebase credentials found');
    throw new Error('Firebase service account not configured');
  }
}

admin.initializeApp({
  credential: credential,
  projectId: "zero-club"
});

const db = admin.firestore();
const auth = admin.auth();
const FieldValue = admin.firestore.FieldValue;

module.exports = {
  admin,
  db,
  auth,
  FieldValue
};
