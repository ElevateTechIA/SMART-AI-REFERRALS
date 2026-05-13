import { readFileSync } from 'fs'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

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
if (!splitDoc.exists) {
  console.error('config/commissionSplit does not exist — aborting.')
  process.exit(1)
}
const split = splitDoc.data()
const total = (split.promoterPercent ?? 0) + (split.consumerPercent ?? 0) + (split.platformPercent ?? 0)
if (total !== 100) {
  console.error(`Split must sum to 100, got ${total} — aborting.`)
  process.exit(1)
}

console.log(`Using split: promoter ${split.promoterPercent}% / consumer ${split.consumerPercent}% / platform ${split.platformPercent}%\n`)

const businessesSnap = await db.collection('businesses').get()
const businessNames = new Map()
for (const b of businessesSnap.docs) {
  businessNames.set(b.id, b.data().name)
}

const offersSnap = await db.collection('offers').get()
const batch = db.batch()
let updated = 0
let skipped = 0

for (const doc of offersSnap.docs) {
  const d = doc.data()
  const name = businessNames.get(doc.id) || '(unknown)'
  const price = Number(d.pricePerNewCustomer) || 0

  if (price <= 0) {
    console.log(`SKIP  ${name.padEnd(35)} — pricePerNewCustomer is ${price}`)
    skipped++
    continue
  }

  const promoterAmount = Math.floor(price * split.promoterPercent / 100)
  const consumerAmount = Math.floor(price * split.consumerPercent / 100)

  const before = `$${d.referrerCommissionAmount ?? '?'} promoter, $${d.consumerRewardValue ?? '?'} consumer`
  const after = `$${promoterAmount} promoter, $${consumerAmount} consumer`
  console.log(`UPDATE ${name.padEnd(35)} price=$${price}  ${before}  →  ${after}`)

  batch.update(doc.ref, {
    referrerCommissionAmount: promoterAmount,
    referrerCommissionPercentage: split.promoterPercent,
    consumerRewardValue: consumerAmount,
    updatedAt: FieldValue.serverTimestamp(),
  })
  updated++
}

if (updated > 0) {
  await batch.commit()
  console.log(`\n✓ Committed ${updated} offer updates. (${skipped} skipped)`)
} else {
  console.log(`\nNo offers to update.`)
}

process.exit(0)
