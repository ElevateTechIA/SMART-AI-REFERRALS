// Migration script: Add 'referrer' role to all consumer-only users
// This supports the merge of consumer and promoter roles into a single unified role.
// Existing consumers get auto-approved (referrerStatus: 'active') since they are trusted users.
// Run with: node scripts/migrate-consumers-to-referrers.js

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

async function migrateConsumersToReferrers() {
  try {
    console.log('Querying users with consumer role...\n');

    const snapshot = await db.collection('users')
      .where('roles', 'array-contains', 'consumer')
      .get();

    if (snapshot.empty) {
      console.log('No users with consumer role found. Nothing to migrate.');
      process.exit(0);
      return;
    }

    console.log(`Found ${snapshot.size} user(s) with consumer role.\n`);

    let updated = 0;
    let skipped = 0;

    for (const userDoc of snapshot.docs) {
      const userData = userDoc.data();
      const roles = userData.roles || [];
      const name = userData.name || userData.email || userDoc.id;

      if (roles.includes('referrer')) {
        console.log(`  SKIP: ${name} - already has referrer role`);
        skipped++;
        continue;
      }

      // Add 'referrer' role and set referrerStatus to 'active' (auto-approve existing consumers)
      const newRoles = [...roles, 'referrer'];
      const updateData = {
        roles: newRoles,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Only set referrerStatus if not already set
      if (!userData.referrerStatus) {
        updateData.referrerStatus = 'active';
      }

      await userDoc.ref.update(updateData);
      console.log(`  UPDATED: ${name} - roles: [${newRoles.join(', ')}], referrerStatus: ${updateData.referrerStatus || userData.referrerStatus}`);
      updated++;
    }

    console.log(`\nMigration complete!`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Skipped (already had referrer role): ${skipped}`);
    console.log(`  Total processed: ${snapshot.size}`);
  } catch (error) {
    console.error('Migration error:', error.message);
  }

  process.exit(0);
}

migrateConsumersToReferrers();
