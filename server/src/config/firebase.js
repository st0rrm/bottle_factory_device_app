const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
const serviceAccount = require(path.join(__dirname, '../../../scripts/service-account.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "bottler-project1"
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

module.exports = {
  admin,
  db,
  FieldValue
};
