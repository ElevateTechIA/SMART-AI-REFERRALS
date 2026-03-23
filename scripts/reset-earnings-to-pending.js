/**
 * Reset all APPROVED earnings back to PENDING for testing
 * Usage: node scripts/reset-earnings-to-pending.js
 */
const admin = require('firebase-admin')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  })
}

const db = admin.firestore()

async function main() {
  const snap = await db.collection('earnings').where('status', '==', 'APPROVED').get()
  console.log(`Found ${snap.size} APPROVED earnings to reset to PENDING`)

  let batch = db.batch()
  let count = 0
  for (const doc of snap.docs) {
    batch.update(doc.ref, { status: 'PENDING', approvedAt: null, updatedAt: new Date() })
    count++
    if (count % 400 === 0) {
      await batch.commit()
      batch = db.batch()
    }
  }
  if (count > 0) await batch.commit()
  console.log(`✓ Reset ${count} earnings to PENDING`)
}

main().catch(console.error)
