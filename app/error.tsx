'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Logged with the digest so the line shows up next to Vercel's runtime
    // log entry for the same error, making it easy to find the stack trace.
    console.error('App error:', { message: error.message, digest: error.digest, stack: error.stack })
  }, [error])

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center"
      style={{ background: 'var(--theme-gradientFrom, var(--background))' }}
    >
      <h2 className="text-2xl font-bold" style={{ color: 'var(--theme-textPrimary)' }}>
        Something went wrong
      </h2>
      <p className="text-sm max-w-md" style={{ color: 'var(--theme-textSecondary)' }}>
        An unexpected error occurred. Please try again.
      </p>
      {/* Surface the Next.js digest. Users can screenshot this and send it
          to support; we look it up in Vercel runtime logs to get the real
          stack trace without needing to reproduce. */}
      {error.digest && (
        <p
          className="text-[11px] font-mono px-2 py-1 rounded select-all"
          style={{
            color: 'var(--theme-textSecondary)',
            background: 'var(--theme-cardBg, rgba(0,0,0,0.1))',
          }}
        >
          Error ID: {error.digest}
        </p>
      )}
      <Button onClick={reset} style={{ background: 'var(--theme-primary)', color: '#fff', borderColor: 'var(--theme-primary)' }}>
        Try again
      </Button>
    </div>
  )
}
