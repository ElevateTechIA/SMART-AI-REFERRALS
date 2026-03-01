import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { isValidPhoneNumber } from 'libphonenumber-js'
import { US_STATES } from '@/lib/constants/us-states'

export const dynamic = 'force-dynamic'

const validStates = US_STATES.map((s) => s.value)

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validateDateOfBirth(dob: string): { valid: boolean; error?: string } {
  const date = new Date(dob)
  if (isNaN(date.getTime())) return { valid: false, error: 'Invalid date' }

  const today = new Date()
  const age = today.getFullYear() - date.getFullYear()
  const monthDiff = today.getMonth() - date.getMonth()
  const dayDiff = today.getDate() - date.getDate()
  const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age

  if (actualAge < 13) return { valid: false, error: 'Must be at least 13 years old' }
  if (actualAge > 120) return { valid: false, error: 'Invalid date of birth' }

  return { valid: true }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }
    const userId = authResult.uid

    const body = await request.json()
    const { name, secondaryEmail, dateOfBirth, state, city, zipcode, phone, bankInfo } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return NextResponse.json({ error: 'Name must be 2-100 characters' }, { status: 400 })
    }

    if (secondaryEmail && !validateEmail(secondaryEmail)) {
      return NextResponse.json({ error: 'Invalid contact email' }, { status: 400 })
    }

    if (!dateOfBirth) {
      return NextResponse.json({ error: 'Date of birth is required' }, { status: 400 })
    }
    const dobResult = validateDateOfBirth(dateOfBirth)
    if (!dobResult.valid) {
      return NextResponse.json({ error: dobResult.error }, { status: 400 })
    }

    if (!state || !validStates.includes(state)) {
      return NextResponse.json({ error: 'Invalid state' }, { status: 400 })
    }

    if (!city || typeof city !== 'string' || city.trim().length < 2 || city.trim().length > 100) {
      return NextResponse.json({ error: 'City must be 2-100 characters' }, { status: 400 })
    }

    if (!zipcode || !/^\d{5}$/.test(zipcode)) {
      return NextResponse.json({ error: 'Zip code must be 5 digits' }, { status: 400 })
    }

    if (phone && !isValidPhoneNumber(phone, 'US')) {
      return NextResponse.json({ error: 'Invalid US phone number' }, { status: 400 })
    }

    // Validate bank info only if provided (optional)
    let validatedBankInfo = undefined
    if (bankInfo && typeof bankInfo === 'object') {
      const { bankName, accountHolderName, routingNumber, accountNumber, accountType } = bankInfo

      // Only validate if at least one bank field is filled
      const hasBankData = bankName || accountHolderName || routingNumber || accountNumber || accountType
      if (hasBankData) {
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

        validatedBankInfo = {
          bankName: bankName.trim(),
          accountHolderName: accountHolderName.trim(),
          routingNumber,
          accountNumber,
          accountType,
        }
      }
    }

    // Profile is complete when all required fields are present (bank info NOT required)
    const profileComplete = true

    const updateData: Record<string, unknown> = {
      name: name.trim(),
      secondaryEmail: secondaryEmail ? secondaryEmail.trim() : null,
      dateOfBirth,
      state,
      city: city.trim(),
      zipcode,
      phone: phone || null,
      profileComplete,
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (validatedBankInfo) {
      updateData.bankInfo = validatedBankInfo
    }

    // Strip undefined values
    const cleanData = JSON.parse(JSON.stringify(updateData))
    cleanData.updatedAt = FieldValue.serverTimestamp()

    const db = getAdminDb()
    await db.collection('users').doc(userId).update(cleanData)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating profile:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
