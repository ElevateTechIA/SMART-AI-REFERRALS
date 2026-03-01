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
  console.log(`Total tickets: ${snapshot.size}\n`)
  for (const doc of snapshot.docs) {
    const d = doc.data()
    console.log(`ID: ${doc.id}`)
    console.log(`  Subject: ${d.subject}`)
    console.log(`  Status: ${d.status} | Read: ${d.read} | AdminReply: ${d.adminReply || 'none'}`)
    console.log('')
  }
}

main().catch(console.error)
