import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, getAdminStorage, verifyAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'
import { RECEIPT_EXTRACTION_PROMPT } from '@/lib/receipt/prompts'
import { parseGeminiReceiptResponse } from '@/lib/receipt/parser'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Rate limiting: 10 scans per user per hour
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10
const WINDOW_MS = 3600000 // 1 hour

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(userId)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + WINDOW_MS })
    return true
  }

  if (record.count >= RATE_LIMIT) {
    return false
  }

  record.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status })
    }
    const userId = authResult.uid

    // Rate limit
    if (!checkRateLimit(userId)) {
      return NextResponse.json(
        { error: 'Too many receipt scans. Please try again later.' },
        { status: 429 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const visitId = formData.get('visitId') as string | null

    if (!file || !visitId) {
      return NextResponse.json({ error: 'Missing file or visitId' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum 5MB' }, { status: 400 })
    }

    const db = getAdminDb()

    // Verify visit exists
    const visitDoc = await db.collection('visits').doc(visitId).get()
    if (!visitDoc.exists) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 })
    }

    const visitData = visitDoc.data()!
    const businessId = visitData.businessId as string

    // Authorization: user must be the consumer OR the business owner
    let uploadedByRole: 'consumer' | 'business' = 'consumer'
    if (visitData.consumerUserId === userId) {
      uploadedByRole = 'consumer'
    } else {
      // Check if user is the business owner
      const businessDoc = await db.collection('businesses').doc(businessId).get()
      if (!businessDoc.exists || businessDoc.data()?.ownerUserId !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized: You can only upload receipts for your own visits' },
          { status: 403 }
        )
      }
      uploadedByRole = 'business'
    }

    // Check if receipt already exists for this visit
    const existingReceipt = await db
      .collection('receipts')
      .where('visitId', '==', visitId)
      .limit(1)
      .get()

    if (!existingReceipt.empty) {
      const existingData = existingReceipt.docs[0].data()
      // Allow re-upload only if previous attempt failed
      if (existingData.status !== 'FAILED') {
        return NextResponse.json(
          { error: 'A receipt has already been uploaded for this visit' },
          { status: 409 }
        )
      }
      // Delete the failed receipt and clear receiptId on visit so we can retry
      await db.collection('receipts').doc(existingReceipt.docs[0].id).delete()
      await db.collection('visits').doc(visitId).update({
        receiptId: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    // Upload image to Firebase Storage
    const buffer = Buffer.from(await file.arrayBuffer())
    const bucket = getAdminStorage().bucket()
    const extension = file.name.split('.').pop() || 'jpg'
    const fileName = `receipt-${Date.now()}.${extension}`
    const filePath = `receipts/${visitId}/${fileName}`
    const fileRef = bucket.file(filePath)

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type,
        metadata: { uploadedBy: userId },
      },
    })

    await fileRef.makePublic()
    const imageUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`

    // Call Gemini Vision to extract receipt data
    let receiptStatus: 'EXTRACTED' | 'FAILED' = 'EXTRACTED'
    let extractedData = undefined
    let confidence = 0
    let error: string | undefined = undefined

    try {
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured')
      }

      const base64Image = buffer.toString('base64')
      const modelName = 'gemini-2.0-flash'

      // Use direct fetch instead of SDK to get full error details
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

      console.log(`[Receipt] Calling Gemini API with model: ${modelName}`)

      const geminiResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: RECEIPT_EXTRACTION_PROMPT },
              { inline_data: { mime_type: file.type, data: base64Image } },
            ],
          }],
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.1,
          },
        }),
      })

      const geminiResult = await geminiResponse.json()

      if (!geminiResponse.ok) {
        const errDetail = JSON.stringify(geminiResult).substring(0, 500)
        console.error(`[Receipt] Gemini API error (${geminiResponse.status}):`, errDetail)
        throw new Error(`Gemini API ${geminiResponse.status}: ${errDetail}`)
      }

      const responseText = geminiResult.candidates?.[0]?.content?.parts?.[0]?.text
      if (!responseText) {
        console.error('[Receipt] No text in Gemini response:', JSON.stringify(geminiResult).substring(0, 500))
        throw new Error('No text in Gemini response')
      }

      console.log('[Receipt] Gemini response:', responseText.substring(0, 500))

      const parsed = parseGeminiReceiptResponse(responseText)

      if (parsed.error) {
        receiptStatus = 'FAILED'
        error = parsed.error
      } else {
        extractedData = parsed.data
        confidence = parsed.confidence
      }
    } catch (geminiError: unknown) {
      const errMsg = geminiError instanceof Error ? geminiError.message : String(geminiError)
      console.error('[Receipt] Extraction failed:', errMsg)
      receiptStatus = 'FAILED'
      error = `AI_EXTRACTION_FAILED: ${errMsg.substring(0, 300)}`
    }

    // Save receipt to Firestore (strip undefined values that Firestore rejects)
    const cleanData = extractedData
      ? JSON.parse(JSON.stringify(extractedData))
      : undefined

    const receiptRef = db.collection('receipts').doc()
    const receiptDoc = {
      visitId,
      businessId,
      uploadedByUserId: userId,
      uploadedByRole,
      imageUrl,
      status: receiptStatus,
      ...(cleanData && { extractedData: cleanData }),
      ...(confidence > 0 && { confidence }),
      ...(error && { error }),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await receiptRef.set(receiptDoc)

    // Only link receipt to visit if extraction succeeded
    if (receiptStatus === 'EXTRACTED') {
      await db.collection('visits').doc(visitId).update({
        receiptId: receiptRef.id,
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    return NextResponse.json({
      success: true,
      receipt: {
        id: receiptRef.id,
        ...receiptDoc,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
  } catch (outerError) {
    const msg = outerError instanceof Error ? outerError.message : String(outerError)
    const stack = outerError instanceof Error ? outerError.stack : ''
    console.error('Error scanning receipt:', msg, stack)
    return NextResponse.json({ error: `Failed to process receipt: ${msg}` }, { status: 500 })
  }
}
