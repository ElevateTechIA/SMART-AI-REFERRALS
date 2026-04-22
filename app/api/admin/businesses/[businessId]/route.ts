import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

const EDITABLE_FIELDS = [
  'name',
  'category',
  'description',
  'address',
  'phone',
  'website',
  'images',
] as const

type EditableField = typeof EDITABLE_FIELDS[number]

/**
 * Admin endpoint to update a business profile on behalf of the owner.
 * Scoped to admins (full or limited with the `businesses` permission).
 * Intended for helping businesses set up their logo, description, contact info.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    const authResult = await verifyAdmin(request, 'businesses')
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { businessId } = params
    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    const body = await request.json()

    const updates: Record<string, unknown> = {}
    for (const key of EDITABLE_FIELDS) {
      if (body[key] === undefined) continue
      if (key === 'images') {
        if (!Array.isArray(body.images) || body.images.some((u: unknown) => typeof u !== 'string')) {
          return NextResponse.json({ error: 'images must be an array of strings' }, { status: 400 })
        }
        updates.images = body.images
        continue
      }
      if (typeof body[key] !== 'string') {
        return NextResponse.json({ error: `${key} must be a string` }, { status: 400 })
      }
      updates[key as EditableField] = (body[key] as string).trim()
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const businessRef = getAdminDb().collection('businesses').doc(businessId)
    const businessDoc = await businessRef.get()
    if (!businessDoc.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    updates.updatedAt = FieldValue.serverTimestamp()
    await businessRef.update(updates)

    return NextResponse.json({ success: true, data: { id: businessId, ...updates } })
  } catch (error) {
    console.error('Error updating business profile (admin):', error)
    return NextResponse.json({ error: 'Failed to update business' }, { status: 500 })
  }
}
