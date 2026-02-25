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

// PUT — reply to a support ticket (admin only)
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
    const { ticketId, reply, status } = body

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

    if (reply !== undefined) {
      const trimmedReply = String(reply).trim()
      if (trimmedReply.length > 0) {
        updateData.adminReply = trimmedReply
        updateData.repliedBy = authResult.uid
      }
    }

    if (status && (status === 'open' || status === 'resolved')) {
      updateData.status = status
    }

    await ticketRef.update(updateData)

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticketId,
        ...ticketDoc.data(),
        ...updateData,
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
