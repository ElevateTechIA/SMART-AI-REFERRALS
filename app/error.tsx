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
    console.error('App error:', error)
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
      <Button onClick={reset} style={{ background: 'var(--theme-primary)', color: '#fff', borderColor: 'var(--theme-primary)' }}>
        Try again
      </Button>
    </div>
  )
}
