import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import { getCommissionSplit, saveCommissionSplit } from '@/lib/commission-config.server'
import { calculateSplit } from '@/lib/commission-config'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const split = await getCommissionSplit()
    return NextResponse.json({ success: true, data: split })
  } catch (error) {
    console.error('Error fetching commission config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch commission config' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json()
    const { promoterPercent, consumerPercent, platformPercent } = body

    if (
      typeof promoterPercent !== 'number' || promoterPercent < 0 || promoterPercent > 100 ||
      typeof consumerPercent !== 'number' || consumerPercent < 0 || consumerPercent > 100 ||
      typeof platformPercent !== 'number' || platformPercent < 0 || platformPercent > 100
    ) {
      return NextResponse.json(
        { error: 'All percentages must be numbers between 0 and 100' },
        { status: 400 }
      )
    }

    const total = promoterPercent + consumerPercent + platformPercent
    if (total !== 100) {
      return NextResponse.json(
        { error: `Percentages must sum to 100, got ${total}` },
        { status: 400 }
      )
    }

    await saveCommissionSplit({ promoterPercent, consumerPercent, platformPercent })

    // Recalculate stored amounts on every existing offer so the new split takes
    // effect immediately on public cards (referrerCommissionAmount /
    // consumerRewardValue are denormalized — they don't auto-recompute).
    const db = getAdminDb()
    const offersSnapshot = await db.collection('offers').get()
    let recalculated = 0
    const BATCH_LIMIT = 450
    let batch = db.batch()
    let pending = 0

    for (const offerDoc of offersSnapshot.docs) {
      const data = offerDoc.data()
      const price = Number(data.pricePerNewCustomer) || 0
      if (price <= 0) continue

      const { promoterAmount, consumerAmount } = calculateSplit(price, {
        promoterPercent,
        consumerPercent,
        platformPercent,
      })

      batch.update(offerDoc.ref, {
        referrerCommissionAmount: promoterAmount,
        referrerCommissionPercentage: promoterPercent,
        consumerRewardValue: consumerAmount,
        updatedAt: FieldValue.serverTimestamp(),
      })
      recalculated++
      pending++

      if (pending >= BATCH_LIMIT) {
        await batch.commit()
        batch = db.batch()
        pending = 0
      }
    }

    if (pending > 0) {
      await batch.commit()
    }

    return NextResponse.json({
      success: true,
      message: 'Commission split updated successfully',
      recalculatedOffers: recalculated,
    })
  } catch (error) {
    console.error('Error updating commission config:', error)
    return NextResponse.json(
      { error: 'Failed to update commission config' },
      { status: 500 }
    )
  }
}
