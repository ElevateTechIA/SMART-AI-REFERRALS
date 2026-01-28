import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { isTokenExpired } from '@/lib/qr-checkin'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { visitId: string } }
) {
  try {
    // 1. Verify authentication
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const { visitId } = params
    const body = await request.json()
    const { token } = body

    if (!visitId || !token) {
      return NextResponse.json(
        { error: 'Missing visitId or token' },
        { status: 400 }
      )
    }

    // 2. Get the visit
    const visitRef = getAdminDb().collection('visits').doc(visitId)
    const visitDoc = await visitRef.get()

    if (!visitDoc.exists) {
      return NextResponse.json(
        { error: 'Visit not found' },
        { status: 404 }
      )
    }

    const visit = visitDoc.data()!

    // 3. Verify business ownership
    const businessRef = getAdminDb().collection('businesses').doc(visit.businessId)
    const businessDoc = await businessRef.get()

    if (!businessDoc.exists) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const businessData = businessDoc.data()!

    if (businessData.ownerUserId !== authResult.uid) {
      return NextResponse.json(
        { error: 'Unauthorized: Only the business owner can perform check-ins' },
        { status: 403 }
      )
    }

    // 4. Validate visit has check-in token (backwards compatibility)
    if (!visit.checkInToken) {
      return NextResponse.json(
        { error: 'This visit does not support QR check-in. Please use manual conversion.' },
        { status: 400 }
      )
    }

    // 5. Verify token matches (direct comparison)
    if (token !== visit.checkInToken) {
      return NextResponse.json(
        { error: 'Invalid check-in token' },
        { status: 403 }
      )
    }

    // 6. Check if token expired
    const expiryDate = visit.checkInTokenExpiry?.toDate()
    if (!expiryDate || isTokenExpired(expiryDate)) {
      return NextResponse.json(
        { error: 'Check-in QR code has expired (7 days passed)' },
        { status: 400 }
      )
    }

    // 7. Check if token already used
    if (visit.checkInTokenUsed) {
      return NextResponse.json(
        { error: 'This QR code has already been used for check-in' },
        { status: 400 }
      )
    }

    // 8. Check if already checked in or converted
    if (visit.status === 'CHECKED_IN') {
      return NextResponse.json(
        { error: 'Visit already checked in' },
        { status: 400 }
      )
    }

    if (visit.status === 'CONVERTED') {
      return NextResponse.json(
        { error: 'Visit already converted (cannot check in)' },
        { status: 400 }
      )
    }

    if (visit.status === 'REJECTED') {
      return NextResponse.json(
        { error: 'Visit was rejected (cannot check in)' },
        { status: 400 }
      )
    }

    // 9. Update visit to CHECKED_IN
    await visitRef.update({
      status: 'CHECKED_IN',
      checkInTokenUsed: true,
      checkedInAt: FieldValue.serverTimestamp(),
      checkInByUserId: authResult.uid,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      message: 'Customer checked in successfully',
    })
  } catch (error) {
    console.error('Error processing check-in:', error)
    return NextResponse.json(
      { error: 'Failed to process check-in' },
      { status: 500 }
    )
  }
}
