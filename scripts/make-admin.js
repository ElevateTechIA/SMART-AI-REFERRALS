// Script to make a user admin
// Run with: node scripts/make-admin.js

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

// Parse FIREBASE_PRIVATE_KEY (handle multiline)
const privateKeyMatch = envContent.match(/FIREBASE_PRIVATE_KEY="(.+?)"/s);
const privateKey = privateKeyMatch ? privateKeyMatch[1].replace(/\\n/g, '\n') : '';

// Initialize Firebase Admin
const serviceAccount = {
  projectId: 'smart-ai-referrals',
  clientEmail: 'firebase-adminsdk-fbsvc@smart-ai-referrals.iam.gserviceaccount.com',
  privateKey: privateKey,
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function makeAdmin(email) {
  try {
    console.log(`Looking for user: ${email}`);

    // Find user by email
    const usersSnapshot = await db.collection('users').where('email', '==', email).get();

    if (usersSnapshot.empty) {
      console.log(`User with email ${email} not found in Firestore`);
      console.log('Make sure you have logged in at least once with this email');
      return;
    }

    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();

    console.log(`Found user: ${userData.name} (${userData.email})`);
    console.log(`Current roles: ${userData.roles?.join(', ') || 'none'}`);

    // Add admin role if not already present
    const currentRoles = userData.roles || [];
    if (!currentRoles.includes('admin')) {
      const newRoles = ['admin', ...currentRoles];
      await userDoc.ref.update({ roles: newRoles });
      console.log(`✓ Updated roles to: ${newRoles.join(', ')}`);
    } else {
      console.log('User already has admin role');
    }

    console.log('\nDone! Refresh your browser to see the Admin tab.');
  } catch (error) {
    console.error('Error:', error.message);
  }

  process.exit(0);
}

// Run with the admin email
makeAdmin('cesarvega.col20@gmail.com');
