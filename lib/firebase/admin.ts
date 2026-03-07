import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      // Option 1: Full JSON string in a single env var
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      credential = admin.credential.cert(serviceAccount);
    } else if (process.env.FIREBASE_PRIVATE_KEY) {
      // Option 2: Individual env vars (standard Vercel approach)
      credential = admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    } else {
      // Option 3: Local fallback bypasses Webpack static trace by using eval
      // This hides the exact string from Next.js bundler so it doesn't try to resolve it at build time
      try {
        const getServiceAccount = new Function("return require('../../receipt-systemAccountservice.json')");
        credential = admin.credential.cert(getServiceAccount());
      } catch (e) {
        console.warn('Firebase Service Account not found. Admin SDK will not be initialized.');
      }
    }

    if (credential) {
      admin.initializeApp({
        credential: credential
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error:', error);
  }
}
export const adminDb = admin.apps.length > 0 ? admin.firestore() : null;
export const adminAuth = admin.apps.length > 0 ? admin.auth() : null;
