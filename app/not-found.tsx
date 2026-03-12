import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center"
      style={{ background: 'var(--theme-gradientFrom, var(--background))' }}
    >
      <h2 className="text-6xl font-bold" style={{ color: 'var(--theme-primary)' }}>
        404
      </h2>
      <p className="text-lg font-medium" style={{ color: 'var(--theme-textPrimary)' }}>
        Page not found
      </p>
      <p className="text-sm max-w-md" style={{ color: 'var(--theme-textSecondary)' }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Button asChild style={{ background: 'var(--theme-primary)', color: '#fff', borderColor: 'var(--theme-primary)' }}>
        <Link href="/dashboard">Go home</Link>
      </Button>
    </div>
  )
}
