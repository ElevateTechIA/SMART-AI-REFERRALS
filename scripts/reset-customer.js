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
  // Delete visits
  const visitsSnap = await db.collection('visits').where('consumerUserId', '==', CONSUMER_ID).get()
  // Delete fraudFlags
  const fraudSnap = await db.collection('fraudFlags').where('consumerUserId', '==', CONSUMER_ID).get()

  const total = visitsSnap.size + fraudSnap.size
  if (total === 0) {
    console.log('No documents found for this customer.')
    return
  }

  const batch = db.batch()
  visitsSnap.docs.forEach(doc => batch.delete(doc.ref))
  fraudSnap.docs.forEach(doc => batch.delete(doc.ref))
  await batch.commit()

  console.log(`Deleted ${visitsSnap.size} visit(s) and ${fraudSnap.size} fraud flag(s) for customer ${CONSUMER_ID}`)
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1) })
