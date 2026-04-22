import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Returns the currently running server version.
 * Clients poll this and compare against the version they were loaded with
 * (NEXT_PUBLIC_APP_VERSION, inlined at build time) to detect new deploys.
 */
export async function GET() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION || '0.0.0'
  return NextResponse.json(
    { version },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  )
}
