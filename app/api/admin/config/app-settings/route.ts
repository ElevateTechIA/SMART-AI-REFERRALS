import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/firebase/admin'
import { getAppSettings, saveAppSettings } from '@/lib/app-settings.server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdmin(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      )
    }

    const settings = await getAppSettings()
    return NextResponse.json({ success: true, data: settings })
  } catch (error) {
    console.error('Error fetching app settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch app settings' },
      { status: 500 }
    )
  }
}

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
    const { autoApproveBusinesses, autoApproveReferrers } = body

    const updates: Record<string, boolean> = {}
    if (typeof autoApproveBusinesses === 'boolean') updates.autoApproveBusinesses = autoApproveBusinesses
    if (typeof autoApproveReferrers === 'boolean') updates.autoApproveReferrers = autoApproveReferrers

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'At least one of autoApproveBusinesses or autoApproveReferrers must be provided as a boolean' },
        { status: 400 }
      )
    }

    await saveAppSettings(updates)

    return NextResponse.json({
      success: true,
      message: 'App settings updated successfully',
    })
  } catch (error) {
    console.error('Error updating app settings:', error)
    return NextResponse.json(
      { error: 'Failed to update app settings' },
      { status: 500 }
    )
  }
}
