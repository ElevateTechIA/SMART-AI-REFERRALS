import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminStorage, verifyAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }
    const userId = authResult.uid

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const businessId = formData.get('businessId') as string | null

    if (!file || !businessId) {
      return NextResponse.json({ error: 'Missing file or businessId' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum 5MB' }, { status: 400 })
    }

    // Verify business ownership
    const db = getAdminDb()
    const businessDoc = await db.collection('businesses').doc(businessId).get()

    if (!businessDoc.exists) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    if (businessDoc.data()?.ownerUserId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Upload to Firebase Storage
    const bucket = getAdminStorage().bucket()
    const extension = file.name.split('.').pop() || 'jpg'
    const fileName = `cover-${Date.now()}.${extension}`
    const filePath = `businesses/${businessId}/${fileName}`

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileRef = bucket.file(filePath)

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: { uploadedBy: userId },
      },
    })

    await fileRef.makePublic()
    const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`

    // Append URL to business images array in Firestore
    await db.collection('businesses').doc(businessId).update({
      images: FieldValue.arrayUnion(downloadUrl),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true, url: downloadUrl })
  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
  }
}
