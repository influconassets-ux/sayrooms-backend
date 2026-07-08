const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');

// Initialize Firebase Admin SDK
// The user has the service account details in .env
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    }),
    storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
  });
}

// Explicitly pass the bucket name
const bucketName = `${process.env.FIREBASE_PROJECT_ID}.appspot.com`;
const bucket = getStorage().bucket(bucketName);

module.exports = { bucket };
