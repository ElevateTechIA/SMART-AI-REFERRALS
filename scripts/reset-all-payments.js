/**
 * Reset all charges to OWED status and delete all charge_payments.
 * Usage: node scripts/reset-all-payments.js
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
  // 1. Reset all charges to OWED
  const chargesSnap = await db.collection('charges').get()
  console.log(`Found ${chargesSnap.size} charges to reset`)

  let batch = db.batch()
  let count = 0

  for (const doc of chargesSnap.docs) {
    batch.update(doc.ref, {
      status: 'OWED',
      paidAmount: 0,
      paidAt: null,
      updatedAt: new Date(),
    })
    count++
    if (count % 400 === 0) {
      await batch.commit()
      batch = db.batch()
      console.log(`  Reset ${count} charges...`)
    }
  }
  if (count % 400 !== 0) {
    await batch.commit()
  }
  console.log(`✓ Reset ${count} charges to OWED`)

  // 2. Delete all charge_payments
  const paymentsSnap = await db.collection('charge_payments').get()
  console.log(`Found ${paymentsSnap.size} payments to delete`)

  batch = db.batch()
  let pCount = 0
  for (const doc of paymentsSnap.docs) {
    batch.delete(doc.ref)
    pCount++
    if (pCount % 400 === 0) {
      await batch.commit()
      batch = db.batch()
      console.log(`  Deleted ${pCount} payments...`)
    }
  }
  if (pCount % 400 !== 0) {
    await batch.commit()
  }
  console.log(`✓ Deleted ${pCount} charge payments`)

  console.log('\nDone! All charges are now OWED. Refresh the admin page.')
}

main().catch(console.error)
