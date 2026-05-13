import 'dotenv/config'
import { readFileSync } from 'fs'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Load .env.local manually since dotenv defaults to .env
const envFile = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
for (const line of envFile.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const eq = trimmed.indexOf('=')
  if (eq === -1) continue
  const key = trimmed.slice(0, eq)
  let val = trimmed.slice(eq + 1)
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
  if (!process.env[key]) process.env[key] = val
}

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  })
}

const db = getFirestore()

const splitDoc = await db.doc('config/commissionSplit').get()
console.log('=== GLOBAL COMMISSION SPLIT (config/commissionSplit) ===')
console.log(splitDoc.exists ? splitDoc.data() : '(doc does not exist — using defaults 30/30/40)')
console.log()

const businessesSnap = await db.collection('businesses').get()
const businessNames = new Map()
for (const b of businessesSnap.docs) {
  businessNames.set(b.id, { name: b.data().name, status: b.data().status })
}

const offersSnap = await db.collection('offers').get()
console.log(`=== OFFERS (${offersSnap.size} total) ===`)
for (const doc of offersSnap.docs) {
  const d = doc.data()
  const biz = businessNames.get(doc.id)
  console.log(`\n--- ${biz?.name || '(unknown business)'} (${doc.id}) ---`)
  console.log(`  business status:           ${biz?.status || '(missing)'}`)
  console.log(`  active:                    ${d.active}`)
  console.log(`  pricePerNewCustomer:       ${d.pricePerNewCustomer}`)
  console.log(`  referrerCommissionAmount:  ${d.referrerCommissionAmount}`)
  console.log(`  referrerCommissionPercent: ${d.referrerCommissionPercentage}`)
  console.log(`  consumerRewardType:        ${d.consumerRewardType}`)
  console.log(`  consumerRewardValue:       ${d.consumerRewardValue}`)
  console.log(`  updatedAt:                 ${d.updatedAt?.toDate?.()?.toISOString() || d.updatedAt}`)
}

process.exit(0)
