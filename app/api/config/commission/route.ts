import { NextResponse } from 'next/server'
import { getCommissionSplit } from '@/lib/commission-config.server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const split = await getCommissionSplit()
    return NextResponse.json({ success: true, data: split })
  } catch (error) {
    console.error('Error fetching commission config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch commission config' },
      { status: 500 }
    )
  }
}
