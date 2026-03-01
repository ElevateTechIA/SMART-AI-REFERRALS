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
  // Show full ticket data
  const ticketSnap = await db.collection('support_tickets').get()
  console.log('=== TICKETS ===')
  for (const doc of ticketSnap.docs) {
    console.log(JSON.stringify({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate(), updatedAt: doc.data().updatedAt?.toDate() }, null, 2))
  }

  // Find the business user "Elevate Tech AI"
  console.log('\n=== USERS matching "Elevate Tech" ===')
  const usersSnap = await db.collection('users').where('email', '==', 'elevatetechagency@gmail.com').get()
  for (const doc of usersSnap.docs) {
    const d = doc.data()
    console.log(`UID: ${doc.id} | Name: ${d.name} | Email: ${d.email} | Roles: ${d.roles}`)
  }
}

main().catch(console.error)
