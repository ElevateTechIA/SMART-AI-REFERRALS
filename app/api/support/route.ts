import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAuth } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

// GET — fetch user's own support tickets
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const db = getAdminDb()
    const snapshot = await db
      .collection('support_tickets')
      .where('userId', '==', authResult.uid)
      .orderBy('createdAt', 'desc')
      .get()

    const tickets = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        userId: data.userId,
        userName: data.userName,
        userEmail: data.userEmail,
        subject: data.subject,
        message: data.message,
        status: data.status,
        adminReply: data.adminReply || null,
        repliedBy: data.repliedBy || null,
        createdAt: data.createdAt?.toDate() || null,
        updatedAt: data.updatedAt?.toDate() || null,
      }
    })

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Error fetching support tickets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    )
  }
}

// POST — create a support ticket
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json()
    const { subject, message } = body

    if (!subject || !message) {
      return NextResponse.json(
        { error: 'Subject and message are required' },
        { status: 400 }
      )
    }

    const trimmedSubject = String(subject).trim()
    const trimmedMessage = String(message).trim()

    if (trimmedSubject.length < 3 || trimmedSubject.length > 200) {
      return NextResponse.json(
        { error: 'Subject must be between 3 and 200 characters' },
        { status: 400 }
      )
    }

    if (trimmedMessage.length < 10 || trimmedMessage.length > 2000) {
      return NextResponse.json(
        { error: 'Message must be between 10 and 2000 characters' },
        { status: 400 }
      )
    }

    const db = getAdminDb()

    // Get user info
    const userDoc = await db.collection('users').doc(authResult.uid).get()
    const userData = userDoc.data()

    const ticketData = {
      userId: authResult.uid,
      userName: userData?.name || 'Anonymous',
      userEmail: userData?.email || '',
      subject: trimmedSubject,
      message: trimmedMessage,
      status: 'open',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    const docRef = await db.collection('support_tickets').add(ticketData)

    return NextResponse.json({
      success: true,
      ticket: {
        id: docRef.id,
        ...ticketData,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('Error creating support ticket:', error)
    return NextResponse.json(
      { error: 'Failed to create support ticket' },
      { status: 500 }
    )
  }
}
