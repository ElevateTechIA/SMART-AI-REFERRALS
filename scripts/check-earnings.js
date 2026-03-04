#!/usr/bin/env node
/**
 * Check all earnings for a user
 * Run with: node scripts/check-earnings.js <userId>
 */
require('dotenv').config({ path: '.env.local' })
const admin = require('firebase-admin')

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

const db = admin.firestore()

async function check(userId) {
  if (!userId) {
    console.log('Usage: node scripts/check-earnings.js <userId>')
    process.exit(1)
  }

  console.log(`\n💰 Earnings for user: ${userId}\n`)

  const snapshot = await db.collection('earnings').where('userId', '==', userId).get()

  for (const doc of snapshot.docs) {
    const data = doc.data()
    const businessDoc = await db.collection('businesses').doc(data.businessId).get()
    const businessName = businessDoc.exists ? businessDoc.data().name : data.businessId

    console.log(`Earning ID: ${doc.id}`)
    console.log(`  Type: ${data.type}`)
    console.log(`  Amount: $${data.amount}`)
    console.log(`  Status: ${data.status}`)
    console.log(`  Business: ${businessName} (${data.businessId})`)
    console.log(`  Visit ID: ${data.visitId}`)
    console.log(`  Created: ${data.createdAt?.toDate().toLocaleString()}`)
    console.log('')
  }

  console.log(`Total: ${snapshot.size} earnings\n`)

  // Also check charges for businesses this user owns
  const chargesSnapshot = await db.collection('charges').get()
  console.log(`\n📋 All charges:\n`)
  for (const doc of chargesSnapshot.docs) {
    const data = doc.data()
    const businessDoc = await db.collection('businesses').doc(data.businessId).get()
    const businessName = businessDoc.exists ? businessDoc.data().name : data.businessId
    console.log(`Charge ID: ${doc.id}`)
    console.log(`  Business: ${businessName}`)
    console.log(`  Amount: $${data.amount}`)
    console.log(`  Platform: $${data.platformAmount}`)
    console.log(`  Referrer: $${data.referrerAmount}`)
    console.log(`  Consumer: $${data.consumerRewardAmount}`)
    console.log(`  Visit: ${data.visitId}`)
    console.log(`  Status: ${data.status}`)
    console.log('')
  }

  process.exit(0)
}

check(process.argv[2])
