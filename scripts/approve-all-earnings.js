/**
 * Approve all PENDING earnings → APPROVED
 * Usage: node scripts/approve-all-earnings.js
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
  const snap = await db.collection('earnings').where('status', '==', 'PENDING').get()
  console.log(`Found ${snap.size} PENDING earnings`)

  let batch = db.batch()
  let count = 0
  for (const doc of snap.docs) {
    batch.update(doc.ref, { status: 'APPROVED', updatedAt: new Date() })
    count++
    if (count % 400 === 0) {
      await batch.commit()
      batch = db.batch()
    }
  }
  if (count > 0) await batch.commit()
  console.log(`✓ Approved ${count} earnings`)
}

main().catch(console.error)
