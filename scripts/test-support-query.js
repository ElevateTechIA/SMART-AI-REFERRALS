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
  const userId = 'C9nKk23a3df5yj2f3LAUOTZMINg2'

  try {
    const snapshot = await db
      .collection('support_tickets')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get()

    console.log(`Query succeeded. Found ${snapshot.size} tickets.`)
    snapshot.docs.forEach(doc => console.log(doc.id, doc.data().subject))
  } catch (error) {
    console.error('Query FAILED:', error.message)
  }
}

main().catch(console.error)
