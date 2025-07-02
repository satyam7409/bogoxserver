// firebaseAdmin.js
import admin from 'firebase-admin';

// Parse the Firebase service account JSON from env variable
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_CONFIG);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;