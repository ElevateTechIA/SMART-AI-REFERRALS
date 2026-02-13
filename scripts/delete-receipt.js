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
  const visitId = process.argv[2]
  if (!visitId) {
    // If no visitId provided, find ALL receipts and let user choose
    const snapshot = await db.collection('receipts').get()
    if (snapshot.empty) {
      console.log('No receipts found.')
      return
    }
    console.log(`Found ${snapshot.size} receipt(s):`)
    for (const doc of snapshot.docs) {
      const d = doc.data()
      console.log(`  - ${doc.id} | visit: ${d.visitId} | status: ${d.status} | store: ${d.extractedData?.storeName || 'N/A'}`)
    }
    console.log('\nUsage: node scripts/delete-receipt.js <visitId>')
    return
  }

  // Find receipt for this visit
  const snapshot = await db.collection('receipts').where('visitId', '==', visitId).get()
  if (snapshot.empty) {
    console.log(`No receipt found for visit ${visitId}`)
    return
  }

  for (const doc of snapshot.docs) {
    const d = doc.data()
    console.log(`Deleting receipt ${doc.id} (status: ${d.status}, store: ${d.extractedData?.storeName || 'N/A'})`)
    await doc.ref.delete()
    console.log(`  Deleted receipt ${doc.id}`)
  }

  // Clear receiptId from visit
  await db.collection('visits').doc(visitId).update({
    receiptId: admin.firestore.FieldValue.delete(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  })
  console.log(`  Cleared receiptId from visit ${visitId}`)
  console.log('Done! You can now re-upload a receipt for this visit.')
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1) })
