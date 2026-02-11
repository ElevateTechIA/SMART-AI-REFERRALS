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
  const snapshot = await db.collection('fraudFlags').get()
  if (snapshot.empty) {
    console.log('No fraud flags found.')
    return
  }
  const batch = db.batch()
  snapshot.docs.forEach(doc => batch.delete(doc.ref))
  await batch.commit()
  console.log(`Deleted ${snapshot.size} fraud flags.`)
}

main().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1) })
