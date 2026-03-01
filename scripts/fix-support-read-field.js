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
  const snapshot = await db.collection('support_tickets').get()

  let updated = 0
  let skipped = 0

  for (const doc of snapshot.docs) {
    const data = doc.data()
    if (data.read === undefined || data.read === null) {
      await doc.ref.update({ read: false })
      console.log(`  Updated ticket ${doc.id} (subject: "${data.subject}") -> read: false`)
      updated++
    } else {
      skipped++
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped (already had read field): ${skipped}`)
}

main().catch(console.error)
