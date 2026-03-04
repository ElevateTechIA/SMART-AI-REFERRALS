import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { getCommissionSplit } from '@/lib/commission-config.server'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { offerId: string } }
) {
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { offerId } = params

    // Verify offer exists
    const offerRef = getAdminDb().collection('offers').doc(offerId)
    const offerDoc = await offerRef.get()

    if (!offerDoc.exists) {
      return NextResponse.json(
        { error: 'Offer not found' },
        { status: 404 }
      )
    }

    const offerData = offerDoc.data()!
    const price = offerData.pricePerNewCustomer

    // Fetch commission split config from Firestore (whole dollars, no cents)
    const commissionSplit = await getCommissionSplit()
    const referrerAmount = Math.floor(price * commissionSplit.promoterPercent / 100)
    const consumerAmount = Math.floor(price * commissionSplit.consumerPercent / 100)

    await offerRef.update({
      referrerCommissionAmount: referrerAmount,
      referrerCommissionPercentage: commissionSplit.promoterPercent,
      consumerRewardType: 'cash',
      consumerRewardValue: consumerAmount,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      message: 'Offer commission settings updated successfully',
    })
  } catch (error) {
    console.error('Error updating offer commission:', error)
    return NextResponse.json(
      { error: 'Failed to update offer commission' },
      { status: 500 }
    )
  }
}
