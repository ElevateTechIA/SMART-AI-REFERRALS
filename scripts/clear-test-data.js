/**
 * Clear Test Data Script
 *
 * Deletes ALL documents from visits, earnings, and charges collections.
 * Keeps businesses, offers, and users intact.
 *
 * Usage: node scripts/clear-test-data.js
 */

const admin = require('firebase-admin')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
  console.error('Missing required Firebase environment variables')
  process.exit(1)
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  })
}

const db = admin.firestore()

async function deleteCollection(collectionName) {
  const snapshot = await db.collection(collectionName).get()
  if (snapshot.empty) {
    console.log(`  (empty) ${collectionName}: 0 documents`)
    return 0
  }

  const batch = db.batch()
  snapshot.docs.forEach(doc => batch.delete(doc.ref))
  await batch.commit()
  console.log(`  ✓ Deleted ${snapshot.size} documents from ${collectionName}`)
  return snapshot.size
}

async function main() {
  console.log('🗑️  Clearing visits, earnings & charges...\n')

  const collections = ['visits', 'earnings', 'charges']
  let total = 0

  for (const name of collections) {
    total += await deleteCollection(name)
  }

  console.log(`\n✅ Done! Deleted ${total} documents total.`)
  console.log('Businesses, offers, and users are untouched.')
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
