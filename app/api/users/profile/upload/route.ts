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

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
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

    // Upload to Firebase Storage
    const bucket = getAdminStorage().bucket()
    const extension = file.name.split('.').pop() || 'jpg'
    const fileName = `profile-${Date.now()}.${extension}`
    const filePath = `users/${userId}/${fileName}`

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

    // Update user document with new photo URL
    const db = getAdminDb()
    await db.collection('users').doc(userId).update({
      photoURL: downloadUrl,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true, url: downloadUrl })
  } catch (error) {
    console.error('Error uploading profile photo:', error)
    return NextResponse.json({ error: 'Failed to upload profile photo' }, { status: 500 })
  }
}
