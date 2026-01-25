/**
 * Seed Mock Data Script
 *
 * Creates test businesses, users, visits, and earnings.
 * All mock data is prefixed with [MOCK] for easy identification and deletion.
 *
 * Usage: node scripts/seed-mock-data.js
 * Delete: node scripts/seed-mock-data.js --delete
 */

const admin = require('firebase-admin')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })

// Initialize Firebase Admin using individual env vars (same as lib/firebase/admin.ts)
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
  console.error('Missing required Firebase environment variables:')
  console.error('- FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID ? '✓' : '✗')
  console.error('- FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? '✓' : '✗')
  console.error('- FIREBASE_PRIVATE_KEY:', privateKey ? '✓' : '✗')
  process.exit(1)
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  })
}

const db = admin.firestore()

// Mock data prefix for easy identification
const MOCK_PREFIX = '[MOCK] '

// Mock businesses
const mockBusinesses = [
  {
    name: `${MOCK_PREFIX}Bella Italia Restaurant`,
    category: 'Restaurant',
    description: 'Authentic Italian cuisine with fresh pasta and wood-fired pizza.',
    address: '123 Main Street, Downtown',
    phone: '(555) 123-4567',
    website: 'https://bellaitalia.example.com',
    status: 'active',
  },
  {
    name: `${MOCK_PREFIX}Fresh Fitness Gym`,
    category: 'Fitness',
    description: 'State-of-the-art gym with personal training and group classes.',
    address: '456 Health Blvd, Fitness District',
    phone: '(555) 234-5678',
    website: 'https://freshfitness.example.com',
    status: 'active',
  },
  {
    name: `${MOCK_PREFIX}Glamour Hair Salon`,
    category: 'Health & Beauty',
    description: 'Full-service salon offering cuts, color, and styling.',
    address: '789 Beauty Lane, Style Center',
    phone: '(555) 345-6789',
    website: 'https://glamourhair.example.com',
    status: 'active',
  },
  {
    name: `${MOCK_PREFIX}Quick Auto Repair`,
    category: 'Automotive',
    description: 'Fast and reliable auto repair services.',
    address: '321 Motor Ave, Auto Row',
    phone: '(555) 456-7890',
    website: '',
    status: 'pending',
  },
  {
    name: `${MOCK_PREFIX}Book Haven Bookstore`,
    category: 'Retail',
    description: 'Independent bookstore with rare finds and cozy reading nooks.',
    address: '654 Reader St, Literary Quarter',
    phone: '(555) 567-8901',
    website: 'https://bookhaven.example.com',
    status: 'active',
  },
]

// Mock users (will be created as Firestore docs, not Firebase Auth users)
const mockUsers = [
  {
    name: `${MOCK_PREFIX}Alice Referrer`,
    email: 'mock.alice@example.com',
    roles: ['consumer'],
  },
  {
    name: `${MOCK_PREFIX}Bob Referrer`,
    email: 'mock.bob@example.com',
    roles: ['consumer'],
  },
  {
    name: `${MOCK_PREFIX}Carol Consumer`,
    email: 'mock.carol@example.com',
    roles: ['consumer'],
  },
  {
    name: `${MOCK_PREFIX}David Consumer`,
    email: 'mock.david@example.com',
    roles: ['consumer'],
  },
  {
    name: `${MOCK_PREFIX}Eva BusinessOwner`,
    email: 'mock.eva@example.com',
    roles: ['consumer', 'business'],
  },
]

// Mock offers for active businesses
const mockOffers = {
  pricePerNewCustomer: 50,
  referrerCommissionAmount: 15,
  consumerRewardType: 'cash',
  consumerRewardValue: 5,
  allowPlatformAttribution: true,
  active: true,
}

async function seedData() {
  console.log('🌱 Starting to seed mock data...\n')

  const createdIds = {
    users: [],
    businesses: [],
    offers: [],
    visits: [],
    earnings: [],
  }

  try {
    // 1. Create mock users
    console.log('Creating mock users...')
    for (const userData of mockUsers) {
      const userRef = db.collection('users').doc()
      await userRef.set({
        ...userData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      createdIds.users.push({ id: userRef.id, ...userData })
      console.log(`  ✓ Created user: ${userData.name}`)
    }

    // 2. Create mock businesses (owned by the last mock user - Eva)
    console.log('\nCreating mock businesses...')
    const ownerUserId = createdIds.users[createdIds.users.length - 1].id

    for (const businessData of mockBusinesses) {
      const businessRef = db.collection('businesses').doc()
      await businessRef.set({
        ...businessData,
        ownerUserId: ownerUserId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      createdIds.businesses.push({ id: businessRef.id, ...businessData })
      console.log(`  ✓ Created business: ${businessData.name} (${businessData.status})`)

      // 3. Create offers for active businesses
      if (businessData.status === 'active') {
        const offerRef = db.collection('offers').doc(businessRef.id)
        await offerRef.set({
          ...mockOffers,
          businessId: businessRef.id,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        createdIds.offers.push(businessRef.id)
        console.log(`    ✓ Created offer for ${businessData.name}`)
      }
    }

    // 4. Create mock visits (referrals)
    console.log('\nCreating mock visits...')
    const activeBusinesses = createdIds.businesses.filter(b => b.status === 'active')
    const referrers = createdIds.users.slice(0, 2) // Alice and Bob are referrers
    const consumers = createdIds.users.slice(2, 4) // Carol and David are consumers

    const visitStatuses = ['CREATED', 'CHECKED_IN', 'CONVERTED', 'CONVERTED', 'REJECTED']

    for (let i = 0; i < activeBusinesses.length; i++) {
      const business = activeBusinesses[i]
      const referrer = referrers[i % referrers.length]
      const consumer = consumers[i % consumers.length]
      const status = visitStatuses[i % visitStatuses.length]

      const visitRef = db.collection('visits').doc()
      await visitRef.set({
        businessId: business.id,
        consumerUserId: consumer.id,
        referrerUserId: referrer.id,
        offerId: business.id,
        status: status,
        attributionType: 'REFERRER',
        isNewCustomer: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      createdIds.visits.push({ id: visitRef.id, businessId: business.id, status })
      console.log(`  ✓ Created visit: ${consumer.name} → ${business.name} (${status})`)

      // 5. Create earnings for converted visits
      if (status === 'CONVERTED') {
        // Referrer commission
        const referrerEarningRef = db.collection('earnings').doc()
        await referrerEarningRef.set({
          userId: referrer.id,
          businessId: business.id,
          visitId: visitRef.id,
          type: 'REFERRER_COMMISSION',
          amount: mockOffers.referrerCommissionAmount,
          status: 'APPROVED',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        createdIds.earnings.push(referrerEarningRef.id)
        console.log(`    ✓ Created referrer earning: $${mockOffers.referrerCommissionAmount}`)

        // Consumer reward
        const consumerEarningRef = db.collection('earnings').doc()
        await consumerEarningRef.set({
          userId: consumer.id,
          businessId: business.id,
          visitId: visitRef.id,
          type: 'CONSUMER_REWARD',
          amount: mockOffers.consumerRewardValue,
          status: 'APPROVED',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        })
        createdIds.earnings.push(consumerEarningRef.id)
        console.log(`    ✓ Created consumer reward: $${mockOffers.consumerRewardValue}`)
      }
    }

    console.log('\n✅ Mock data seeded successfully!')
    console.log('\nSummary:')
    console.log(`  - Users: ${createdIds.users.length}`)
    console.log(`  - Businesses: ${createdIds.businesses.length}`)
    console.log(`  - Offers: ${createdIds.offers.length}`)
    console.log(`  - Visits: ${createdIds.visits.length}`)
    console.log(`  - Earnings: ${createdIds.earnings.length}`)
    console.log('\n💡 To delete mock data, run: node scripts/seed-mock-data.js --delete')

  } catch (error) {
    console.error('Error seeding data:', error)
    process.exit(1)
  }
}

async function deleteData() {
  console.log('🗑️  Deleting mock data...\n')

  try {
    // Delete users with MOCK prefix
    console.log('Deleting mock users...')
    const usersSnapshot = await db.collection('users').get()
    let userCount = 0
    for (const doc of usersSnapshot.docs) {
      if (doc.data().name?.startsWith(MOCK_PREFIX)) {
        await doc.ref.delete()
        userCount++
      }
    }
    console.log(`  ✓ Deleted ${userCount} mock users`)

    // Delete businesses with MOCK prefix
    console.log('Deleting mock businesses...')
    const businessesSnapshot = await db.collection('businesses').get()
    let businessCount = 0
    const mockBusinessIds = []
    for (const doc of businessesSnapshot.docs) {
      if (doc.data().name?.startsWith(MOCK_PREFIX)) {
        mockBusinessIds.push(doc.id)
        await doc.ref.delete()
        businessCount++
      }
    }
    console.log(`  ✓ Deleted ${businessCount} mock businesses`)

    // Delete offers for mock businesses
    console.log('Deleting mock offers...')
    let offerCount = 0
    for (const businessId of mockBusinessIds) {
      const offerRef = db.collection('offers').doc(businessId)
      const offerDoc = await offerRef.get()
      if (offerDoc.exists) {
        await offerRef.delete()
        offerCount++
      }
    }
    console.log(`  ✓ Deleted ${offerCount} mock offers`)

    // Delete visits for mock businesses
    console.log('Deleting mock visits...')
    const visitsSnapshot = await db.collection('visits').get()
    let visitCount = 0
    const mockVisitIds = []
    for (const doc of visitsSnapshot.docs) {
      if (mockBusinessIds.includes(doc.data().businessId)) {
        mockVisitIds.push(doc.id)
        await doc.ref.delete()
        visitCount++
      }
    }
    console.log(`  ✓ Deleted ${visitCount} mock visits`)

    // Delete earnings for mock visits
    console.log('Deleting mock earnings...')
    const earningsSnapshot = await db.collection('earnings').get()
    let earningCount = 0
    for (const doc of earningsSnapshot.docs) {
      if (mockVisitIds.includes(doc.data().visitId) || mockBusinessIds.includes(doc.data().businessId)) {
        await doc.ref.delete()
        earningCount++
      }
    }
    console.log(`  ✓ Deleted ${earningCount} mock earnings`)

    console.log('\n✅ Mock data deleted successfully!')

  } catch (error) {
    console.error('Error deleting data:', error)
    process.exit(1)
  }
}

// Main execution
const args = process.argv.slice(2)
if (args.includes('--delete')) {
  deleteData().then(() => process.exit(0))
} else {
  seedData().then(() => process.exit(0))
}
