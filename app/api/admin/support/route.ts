import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

// GET — fetch all support tickets (admin only)
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const db = getAdminDb()
    const snapshot = await db
      .collection('support_tickets')
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

    return NextResponse.json({ tickets })
  } catch (error) {
    console.error('Error fetching support tickets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch support tickets' },
      { status: 500 }
    )
  }
}

// PUT — reply to / update a support ticket (admin only)
export async function PUT(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const body = await request.json()
    const { ticketId, reply, status, read } = body

    if (!ticketId) {
      return NextResponse.json(
        { error: 'ticketId is required' },
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

    const updateData: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    }

    let newReply = null

    if (reply !== undefined) {
      const trimmedReply = String(reply).trim()
      if (trimmedReply.length > 0) {
        // Get admin name
        const adminDoc = await db.collection('users').doc(authResult.uid).get()
        const adminName = adminDoc.data()?.name || 'Admin'

        newReply = {
          id: `reply_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          message: trimmedReply,
          senderRole: 'admin',
          senderUserId: authResult.uid,
          senderName: adminName,
          createdAt: new Date(),
        }

        updateData.replies = FieldValue.arrayUnion(newReply)
        updateData.lastReplyAt = FieldValue.serverTimestamp()
        updateData.lastReplyBy = 'admin'
        // Keep legacy field for backward compat
        updateData.adminReply = trimmedReply
        updateData.repliedBy = authResult.uid
      }
    }

    if (status && (status === 'open' || status === 'resolved')) {
      updateData.status = status
    }

    if (typeof read === 'boolean') {
      updateData.read = read
    }

    await ticketRef.update(updateData)

    return NextResponse.json({
      success: true,
      reply: newReply,
      ticket: {
        id: ticketId,
        ...ticketDoc.data(),
        ...updateData,
        replies: undefined, // Don't send FieldValue in response
        updatedAt: new Date(),
      },
    })
  } catch (error) {
    console.error('Error updating support ticket:', error)
    return NextResponse.json(
      { error: 'Failed to update support ticket' },
      { status: 500 }
    )
  }
}
