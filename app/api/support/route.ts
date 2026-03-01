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
      .get()

    const tickets = snapshot.docs
      .map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          userEmail: data.userEmail,
          subject: data.subject,
          message: data.message,
          status: data.status,
          read: data.read ?? false,
          adminReply: data.adminReply || null,
          repliedBy: data.repliedBy || null,
          replies: (data.replies || []).map((r: Record<string, unknown>) => ({
            ...r,
            createdAt: r.createdAt && typeof (r.createdAt as { toDate?: () => Date }).toDate === 'function'
              ? (r.createdAt as { toDate: () => Date }).toDate()
              : r.createdAt || null,
          })),
          lastReplyAt: data.lastReplyAt?.toDate() || null,
          lastReplyBy: data.lastReplyBy || null,
          createdAt: data.createdAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || null,
        }
      })
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
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
      read: false,
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

// PUT — user replies to their own support ticket
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json()
    const { ticketId, message } = body

    if (!ticketId || !message) {
      return NextResponse.json(
        { error: 'ticketId and message are required' },
        { status: 400 }
      )
    }

    const trimmedMessage = String(message).trim()
    if (trimmedMessage.length < 1 || trimmedMessage.length > 2000) {
      return NextResponse.json(
        { error: 'Message must be between 1 and 2000 characters' },
        { status: 400 }
      )
    }

    const db = getAdminDb()
    const ticketRef = db.collection('support_tickets').doc(ticketId)
    const ticketDoc = await ticketRef.get()

    if (!ticketDoc.exists) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    const ticketData = ticketDoc.data()!

    // Verify ownership
    if (ticketData.userId !== authResult.uid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Verify ticket is open
    if (ticketData.status !== 'open') {
      return NextResponse.json(
        { error: 'Cannot reply to a resolved ticket' },
        { status: 400 }
      )
    }

    // Get user's name
    const userDoc = await db.collection('users').doc(authResult.uid).get()
    const userName = userDoc.data()?.name || 'User'

    const newReply = {
      id: `reply_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      message: trimmedMessage,
      senderRole: 'user',
      senderUserId: authResult.uid,
      senderName: userName,
      createdAt: new Date(),
    }

    await ticketRef.update({
      replies: FieldValue.arrayUnion(newReply),
      lastReplyAt: FieldValue.serverTimestamp(),
      lastReplyBy: 'user',
      read: false,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({
      success: true,
      reply: { ...newReply, createdAt: new Date() },
    })
  } catch (error) {
    console.error('Error replying to support ticket:', error)
    return NextResponse.json(
      { error: 'Failed to reply' },
      { status: 500 }
    )
  }
}
