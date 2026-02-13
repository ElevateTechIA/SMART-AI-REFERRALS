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
  // Find all FAILED receipts
  const snapshot = await db.collection('receipts').where('status', '==', 'FAILED').get()
  if (snapshot.empty) {
    console.log('No failed receipts found.')
    return
  }

  console.log(`Found ${snapshot.size} failed receipt(s). Cleaning up...`)

  for (const doc of snapshot.docs) {
    const data = doc.data()
    console.log(`  - Receipt ${doc.id} for visit ${data.visitId} (error: ${data.error})`)

    // Clear receiptId from the visit
    if (data.visitId) {
      await db.collection('visits').doc(data.visitId).update({
        receiptId: admin.firestore.FieldValue.delete(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      console.log(`    Cleared receiptId from visit ${data.visitId}`)
    }

    // Delete the failed receipt document
    await doc.ref.delete()
    console.log(`    Deleted receipt ${doc.id}`)
  }

  console.log('Done!')
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1) })
