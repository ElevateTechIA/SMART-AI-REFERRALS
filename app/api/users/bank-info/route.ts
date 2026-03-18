import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const body = await request.json()
    const { bankName, accountHolderName, routingNumber, accountNumber, accountType } = body

    if (!bankName || typeof bankName !== 'string' || bankName.trim().length < 2 || bankName.trim().length > 100) {
      return NextResponse.json({ error: 'Bank name must be 2-100 characters' }, { status: 400 })
    }
    if (!accountHolderName || typeof accountHolderName !== 'string' || accountHolderName.trim().length < 2 || accountHolderName.trim().length > 100) {
      return NextResponse.json({ error: 'Account holder name must be 2-100 characters' }, { status: 400 })
    }
    if (!routingNumber || !/^\d{9}$/.test(routingNumber)) {
      return NextResponse.json({ error: 'Routing number must be exactly 9 digits' }, { status: 400 })
    }
    if (!accountNumber || !/^\d{4,17}$/.test(accountNumber)) {
      return NextResponse.json({ error: 'Account number must be 4-17 digits' }, { status: 400 })
    }
    if (!accountType || !['checking', 'savings'].includes(accountType)) {
      return NextResponse.json({ error: 'Account type must be checking or savings' }, { status: 400 })
    }

    const db = getAdminDb()
    await db.collection('users').doc(authResult.uid).update({
      bankInfo: {
        bankName: bankName.trim(),
        accountHolderName: accountHolderName.trim(),
        routingNumber,
        accountNumber,
        accountType,
      },
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving bank info:', error)
    return NextResponse.json({ error: 'Failed to save bank info' }, { status: 500 })
  }
}
