'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{
          display: 'flex', minHeight: '100vh', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 16, padding: 16,
          textAlign: 'center', fontFamily: 'system-ui, sans-serif',
          background: 'var(--theme-gradientFrom, #fff)', color: 'var(--theme-textPrimary, #111)',
        }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--theme-textPrimary, #111)' }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 14, color: 'var(--theme-textSecondary, #666)', maxWidth: 400 }}>
            A critical error occurred. Please try again.
          </p>
          {/* See app/error.tsx for why we expose the digest. */}
          {error.digest && (
            <p style={{
              fontSize: 11, fontFamily: 'monospace', padding: '4px 8px',
              borderRadius: 4, background: 'rgba(0,0,0,0.08)',
              color: 'var(--theme-textSecondary, #666)',
              userSelect: 'all',
            }}>
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: '8px 24px', fontSize: 14, borderRadius: 8, cursor: 'pointer',
              border: '1px solid var(--theme-primary, #3B82F6)',
              background: 'var(--theme-primary, #3B82F6)',
              color: '#fff',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
