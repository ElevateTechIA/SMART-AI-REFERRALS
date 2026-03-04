#!/usr/bin/env node
/**
 * Script to find and remove duplicate visits + associated earnings/charges/fraudFlags
 * Run with: node scripts/cleanup-duplicate-visits.js
 *
 * Add --dry-run to preview without deleting
 * Add --execute to actually delete
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
const dryRun = !process.argv.includes('--execute')

async function cleanup() {
  console.log(dryRun ? '🔍 DRY RUN - No data will be deleted\n' : '🗑️  EXECUTE MODE - Will delete duplicate data\n')

  // 1. Fetch ALL visits
  const visitsSnapshot = await db.collection('visits').get()
  console.log(`Total visits in database: ${visitsSnapshot.size}`)

  // 2. Group visits by (consumerUserId, businessId) to find duplicates
  const visitsByKey = new Map()
  for (const doc of visitsSnapshot.docs) {
    const data = doc.data()
    const key = `${data.consumerUserId}__${data.businessId}`
    if (!visitsByKey.has(key)) visitsByKey.set(key, [])
    visitsByKey.get(key).push({ id: doc.id, ...data })
  }

  // 3. Find groups with duplicates
  const duplicateGroups = []
  for (const [key, visits] of visitsByKey) {
    if (visits.length > 1) {
      duplicateGroups.push({ key, visits })
    }
  }

  if (duplicateGroups.length === 0) {
    console.log('\n✅ No duplicate visits found!')
    process.exit(0)
  }

  console.log(`\n⚠️  Found ${duplicateGroups.length} duplicate group(s):\n`)

  const toDelete = { visits: [], earnings: [], charges: [], fraudFlags: [] }

  for (const group of duplicateGroups) {
    const [consumerUserId, businessId] = group.key.split('__')

    // Sort: keep the oldest visit (first created), or CONVERTED over non-converted
    const sorted = group.visits.sort((a, b) => {
      // Prefer CONVERTED status
      if (a.status === 'CONVERTED' && b.status !== 'CONVERTED') return -1
      if (b.status === 'CONVERTED' && a.status !== 'CONVERTED') return 1
      // Then prefer oldest (first visit)
      const aTime = a.createdAt?.toDate?.()?.getTime() || a.createdAt?.getTime?.() || 0
      const bTime = b.createdAt?.toDate?.()?.getTime() || b.createdAt?.getTime?.() || 0
      return aTime - bTime
    })

    const keep = sorted[0]
    const duplicates = sorted.slice(1)

    // Get business name
    const businessDoc = await db.collection('businesses').doc(businessId).get()
    const businessName = businessDoc.exists ? businessDoc.data().name : businessId

    console.log(`📍 Business: ${businessName}`)
    console.log(`   Consumer: ${consumerUserId}`)
    console.log(`   KEEPING: ${keep.id} (status: ${keep.status}, created: ${keep.createdAt?.toDate?.()?.toLocaleString()})`)

    for (const dup of duplicates) {
      console.log(`   DELETING: ${dup.id} (status: ${dup.status}, created: ${dup.createdAt?.toDate?.()?.toLocaleString()})`)
      toDelete.visits.push(dup.id)

      // Find associated earnings
      const earningsSnapshot = await db.collection('earnings').where('visitId', '==', dup.id).get()
      for (const doc of earningsSnapshot.docs) {
        const data = doc.data()
        console.log(`     -> Earning: ${doc.id} (type: ${data.type}, amount: $${data.amount}, user: ${data.userId})`)
        toDelete.earnings.push(doc.id)
      }

      // Find associated charges
      const chargesSnapshot = await db.collection('charges').where('visitId', '==', dup.id).get()
      for (const doc of chargesSnapshot.docs) {
        const data = doc.data()
        console.log(`     -> Charge: ${doc.id} (amount: $${data.amount}, business: ${data.businessId})`)
        toDelete.charges.push(doc.id)
      }

      // Find associated fraud flags
      const fraudSnapshot = await db.collection('fraudFlags').where('visitId', '==', dup.id).get()
      for (const doc of fraudSnapshot.docs) {
        console.log(`     -> FraudFlag: ${doc.id}`)
        toDelete.fraudFlags.push(doc.id)
      }
    }
    console.log('')
  }

  // Also clean up fraud flags for existing duplicates (old ones that weren't caught)
  const allFraudFlags = await db.collection('fraudFlags').get()
  for (const doc of allFraudFlags.docs) {
    const data = doc.data()
    if (!toDelete.fraudFlags.includes(doc.id)) {
      // Check if this fraud flag's visit is one we're already keeping
      const isForDuplicate = toDelete.visits.includes(data.visitId)
      if (!isForDuplicate) {
        // Also delete fraud flags where the visit still exists but is a known duplicate pattern
        console.log(`   Also cleaning fraud flag: ${doc.id} (visit: ${data.visitId}, reason: ${data.reason})`)
        toDelete.fraudFlags.push(doc.id)
      }
    }
  }

  console.log('\n📊 Summary:')
  console.log(`   Visits to delete: ${toDelete.visits.length}`)
  console.log(`   Earnings to delete: ${toDelete.earnings.length}`)
  console.log(`   Charges to delete: ${toDelete.charges.length}`)
  console.log(`   Fraud flags to delete: ${toDelete.fraudFlags.length}`)

  if (dryRun) {
    console.log('\n💡 Run with --execute to actually delete these records')
    process.exit(0)
  }

  // Execute deletion in batches
  console.log('\n🗑️  Deleting...')
  const batch = db.batch()

  for (const id of toDelete.visits) batch.delete(db.collection('visits').doc(id))
  for (const id of toDelete.earnings) batch.delete(db.collection('earnings').doc(id))
  for (const id of toDelete.charges) batch.delete(db.collection('charges').doc(id))
  for (const id of toDelete.fraudFlags) batch.delete(db.collection('fraudFlags').doc(id))

  await batch.commit()
  console.log('✅ Cleanup complete!')

  process.exit(0)
}

cleanup().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
