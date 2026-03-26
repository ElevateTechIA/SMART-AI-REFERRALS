import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminStorage, verifyAdmin } from '@/lib/firebase/admin'
import { logAdminAction } from '@/lib/admin-log'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// POST - Create a payment batch (Pay All with optional receipt)
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const contentType = request.headers.get('content-type') || ''
    let businessId: string
    let totalAmount: number
    let method: string
    let note: string
    let chargeIds: string[]
    let receiptUrl: string | undefined

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      businessId = formData.get('businessId') as string
      totalAmount = Number(formData.get('totalAmount'))
      method = formData.get('method') as string
      note = (formData.get('note') as string) || ''
      chargeIds = JSON.parse((formData.get('chargeIds') as string) || '[]')

      const file = formData.get('file') as File | null
      if (file && file.size > 0) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          return NextResponse.json(
            { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, PDF' },
            { status: 400 }
          )
        }
        if (file.size > MAX_FILE_SIZE) {
          return NextResponse.json({ error: 'File too large. Maximum 10MB' }, { status: 400 })
        }

        const bucket = getAdminStorage().bucket()
        const extension = file.name.split('.').pop() || 'pdf'
        const fileName = `batch-receipt-${Date.now()}.${extension}`
        const filePath = `payment-batches/${businessId}/${fileName}`

        const buffer = Buffer.from(await file.arrayBuffer())
        const fileRef = bucket.file(filePath)

        await fileRef.save(buffer, {
          metadata: {
            contentType: file.type,
            metadata: { uploadedBy: authResult.uid },
          },
        })

        await fileRef.makePublic()
        receiptUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`
      }
    } else {
      const body = await request.json()
      businessId = body.businessId
      totalAmount = body.totalAmount
      method = body.method
      note = body.note || ''
      chargeIds = body.chargeIds || []
    }

    if (!businessId || !method || !chargeIds.length) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const db = getAdminDb()
    const now = new Date()

    const batchData: Record<string, unknown> = {
      businessId,
      totalAmount,
      method,
      note,
      chargeIds,
      status: 'COMPLETED',
      createdAt: now,
      createdBy: authResult.uid,
    }
    if (receiptUrl) {
      batchData.receiptUrl = receiptUrl
    }

    const docRef = await db.collection('payment_batches').add(batchData)

    await logAdminAction({
      action: 'PAYMENT_BATCH_CREATED',
      adminUid: authResult.uid,
      details: { batchId: docRef.id, businessId, totalAmount, method, chargeCount: chargeIds.length, receiptUrl: receiptUrl || null },
    })

    return NextResponse.json({
      success: true,
      data: {
        batchId: docRef.id,
        receiptUrl: receiptUrl || null,
      },
    })
  } catch (error) {
    console.error('Error creating payment batch:', error)
    return NextResponse.json({ error: 'Failed to create payment batch' }, { status: 500 })
  }
}

// GET - Get payment batches for a business
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }

    const { searchParams } = new URL(request.url)
    const businessId = searchParams.get('businessId')

    if (!businessId) {
      return NextResponse.json({ error: 'businessId is required' }, { status: 400 })
    }

    const db = getAdminDb()
    const snapshot = await db.collection('payment_batches')
      .where('businessId', '==', businessId)
      .get()

    const batches = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        businessId: data.businessId,
        totalAmount: data.totalAmount,
        method: data.method,
        note: data.note || '',
        receiptUrl: data.receiptUrl || null,
        chargeIds: data.chargeIds || [],
        status: data.status,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        createdBy: data.createdBy,
      }
    })

    batches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ success: true, data: batches })
  } catch (error) {
    console.error('Error fetching payment batches:', error)
    return NextResponse.json({ error: 'Failed to fetch payment batches' }, { status: 500 })
  }
}
