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
const CONSUMER_ID = 'wVZPzlv4doR7P7m97ubkIYufdOH2'

async function main() {
  console.log('=== ALL CHARGES (last 10) ===')
  const chargesSnap = await db.collection('charges').orderBy('createdAt', 'desc').limit(10).get()
  console.log(`Found ${chargesSnap.size}`)
  chargesSnap.docs.forEach(doc => {
    const d = doc.data()
    console.log(`  id: ${doc.id} | amount: ${d.amount} | status: ${d.status} | businessId: ${d.businessId} | visitId: ${d.visitId}`)
  })

  console.log('\n=== ALL VISITS for consumer ===')
  const visitsSnap = await db.collection('visits').where('consumerUserId', '==', CONSUMER_ID).get()
  console.log(`Found ${visitsSnap.size}`)
  visitsSnap.docs.forEach(doc => {
    const d = doc.data()
    console.log(`  id: ${doc.id} | status: ${d.status} | isNewCustomer: ${d.isNewCustomer} | businessId: ${d.businessId} | createdAt: ${d.createdAt?.toDate?.()}`)
  })

  console.log('\n=== ALL CHARGES (no filter) ===')
  const allCharges = await db.collection('charges').get()
  console.log(`Total charges in DB: ${allCharges.size}`)
  allCharges.docs.forEach(doc => {
    const d = doc.data()
    console.log(`  id: ${doc.id} | amount: ${d.amount} | businessId: ${d.businessId}`)
  })
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1) })
