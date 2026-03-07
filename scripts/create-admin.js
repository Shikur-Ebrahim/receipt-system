const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Path to your service account key file
const serviceAccountPath = path.join(__dirname, '..', 'receipt-systemAccountservice.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.error('Error: service account file not found at ' + serviceAccountPath);
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const email = process.argv[2];
const password = process.argv[3];

if (!email) {
  console.log('Usage: node scripts/create-admin.js <email> [<password>]');
  process.exit(1);
}

async function createAdminUser(email, password) {
  try {
    // Check if user already exists
    let user;
    try {
      user = await admin.auth().getUserByEmail(email);
      console.log(`User already exists with UID: ${user.uid}. Updating claims...`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        if (!password) {
          console.error(`Error: User ${email} not found and no password provided to create them.`);
          process.exit(1);
        }
        user = await admin.auth().createUser({
          email: email,
          password: password,
          emailVerified: true
        });
        console.log(`Successfully created new user with UID: ${user.uid}`);
      } else {
        throw error;
      }
    }

    // Set custom user claims
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });

    // Create/Update user document in Firestore to reflect admin status
    const db = admin.firestore();
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      email: email,
      isAdmin: true,
      role: "admin",
      balance: 1000
    }, { merge: true });

    console.log(`Success! ${email} is now an admin (Custom Claims & Firestore Role Set).`);
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser(email, password);
