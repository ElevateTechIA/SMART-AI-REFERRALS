#!/usr/bin/env node
/**
 * Migrate the `offers` collection from the single-offer-per-business model
 * (`offers/{businessId}`) to the multi-offer model (`offers/{autoId}` with
 * `businessId` as a plain field).
 *
 * Strategy:
 *   - Read every document in `offers/`.
 *   - Detect legacy docs where `doc.id` equals a known `businessId` AND the
 *     doc still uses the old shape.
 *   - For each legacy doc:
 *       * Copy it to a NEW `offers/{autoId}` doc, preserving every field.
 *       * Stamp `legacyOfferId` and `legacyBusinessId` on the new doc for
 *         rollback / forensic purposes.
 *       * Set `status: 'active' | 'archived'` based on the legacy `active`.
 *   - **The legacy doc is NOT deleted.** It stays in place so that any
 *     existing `visit.offerId` references (which equal `businessId`) keep
 *     resolving. Legacy and migrated docs are de-duplicated at read time
 *     because the migration script also flags the legacy doc with
 *     `migratedTo: <newId>` and sets `status: 'archived'` so it no longer
 *     appears as an "active" offer (which would otherwise inflate the
 *     active-offer count past the cap).
 *
 * Usage:
 *   node scripts/migrate-offers-to-multi.mjs              # dry-run (default)
 *   node scripts/migrate-offers-to-multi.mjs --apply      # actually write
 *   node scripts/migrate-offers-to-multi.mjs --rollback   # undo last apply
 *
 * Rollback:
 *   The rollback deletes every offer doc with a `legacyOfferId` field and
 *   clears `migratedTo` + restores `active`/`status` on the legacy docs.
 */

import 'dotenv/config'
import { readFileSync } from 'fs'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

// Load .env.local manually (script-style, mirrors inspect-offers.mjs)
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

const args = new Set(process.argv.slice(2))
const APPLY = args.has('--apply')
const ROLLBACK = args.has('--rollback')

if (APPLY && ROLLBACK) {
  console.error('Cannot use --apply and --rollback together')
  process.exit(1)
}

const mode = ROLLBACK ? 'ROLLBACK' : APPLY ? 'APPLY' : 'DRY-RUN'
console.log(`\n=== Multi-offer migration — mode: ${mode} ===\n`)

if (ROLLBACK) {
  await rollback()
} else {
  await migrate(APPLY)
}

process.exit(0)

// ---------- helpers ----------

async function migrate(apply) {
  // Build a set of valid businessIds so we know which legacy docs to migrate
  const businessesSnap = await db.collection('businesses').get()
  const businessIds = new Set(businessesSnap.docs.map((d) => d.id))
  console.log(`Found ${businessIds.size} business(es).`)

  const offersSnap = await db.collection('offers').get()
  console.log(`Found ${offersSnap.size} offer doc(s) total.\n`)

  let migrated = 0
  let skipped = 0
  let alreadyMigrated = 0

  for (const offerDoc of offersSnap.docs) {
    const data = offerDoc.data()
    const id = offerDoc.id

    // Skip docs that were already created by the new model (auto-generated id
    // is not a businessId; or the doc has a status set; or has legacyOfferId).
    if (data.legacyOfferId) {
      alreadyMigrated++
      continue
    }
    if (!businessIds.has(id)) {
      // It's already an auto-id doc — leave it alone.
      skipped++
      continue
    }
    if (data.migratedTo) {
      // Legacy doc already pointed at its migrated twin.
      alreadyMigrated++
      continue
    }

    // It's a legacy doc with doc.id == businessId. Copy → new auto-id doc.
    const wasActive = data.active !== false
    const newData = {
      ...data,
      businessId: id, // make sure the field is set (it should already be)
      status: wasActive ? 'active' : 'archived',
      legacyOfferId: id,
      legacyBusinessId: id,
      // updatedAt is server-set; keep createdAt from original
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (apply) {
      const newRef = db.collection('offers').doc()
      await newRef.set(newData)
      // Mark the legacy doc as archived + pointing to the new one so it
      // doesn't double-count against the active cap, but DON'T delete it
      // (visit.offerId references may still point at it).
      await offerDoc.ref.update({
        migratedTo: newRef.id,
        status: 'archived',
        active: false,
        updatedAt: FieldValue.serverTimestamp(),
      })
      console.log(`  ✓ ${id} → ${newRef.id} (${wasActive ? 'active' : 'archived'})`)
    } else {
      console.log(`  [dry] would migrate ${id} → <new-auto-id> (${wasActive ? 'active' : 'archived'})`)
    }
    migrated++
  }

  console.log(`\nSummary:`)
  console.log(`  migrated:         ${migrated}${apply ? '' : ' (dry-run, nothing written)'}`)
  console.log(`  already migrated: ${alreadyMigrated}`)
  console.log(`  skipped (auto-id): ${skipped}`)
  console.log(`\nNext steps:`)
  if (!apply) {
    console.log('  Re-run with --apply to perform the migration.')
  } else {
    console.log('  - Verify in Firebase console that new docs exist.')
    console.log('  - Verify legacy docs have `migratedTo` + `status=archived`.')
    console.log('  - Verify referral pages (/r/[businessId]) still render the offers.')
    console.log('  - Backfill `visit.offerId` if you find visits with null offerId (optional).')
  }
}

async function rollback() {
  console.log('Rollback will:')
  console.log('  - Delete every offer doc with `legacyOfferId` set (migrated copies).')
  console.log('  - Restore legacy docs: clear `migratedTo`, set `status=active`, `active=true`.\n')

  const migratedCopies = await db
    .collection('offers')
    .where('legacyOfferId', '!=', null)
    .get()
  console.log(`Found ${migratedCopies.size} migrated copy/copies to delete.`)

  for (const copy of migratedCopies.docs) {
    await copy.ref.delete()
    console.log(`  ✓ deleted offers/${copy.id}`)
  }

  const archivedLegacy = await db
    .collection('offers')
    .where('migratedTo', '!=', null)
    .get()
  console.log(`Found ${archivedLegacy.size} legacy doc(s) flagged migratedTo to restore.`)
  for (const legacy of archivedLegacy.docs) {
    await legacy.ref.update({
      migratedTo: FieldValue.delete(),
      status: 'active',
      active: true,
      updatedAt: FieldValue.serverTimestamp(),
    })
    console.log(`  ✓ restored offers/${legacy.id}`)
  }

  console.log('\nRollback complete.')
}
