'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { TEST_ACCOUNTS } from '@/lib/auth/test-accounts'
import { Loader2, AlertTriangle, UserCheck } from 'lucide-react'

export function TestLoginPanel() {
  if (process.env.NEXT_PUBLIC_ENABLE_TEST_AUTH !== 'true') return null

  return <TestLoginPanelInner />
}

function TestLoginPanelInner() {
  const [seeding, setSeeding] = useState(false)
  const [seeded, setSeeded] = useState(false)
  const [loggingIn, setLoggingIn] = useState<string | null>(null)
  const { signInWithEmail } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleSeed = async () => {
    setSeeding(true)
    try {
      const res = await fetch('/api/auth/seed-test-users', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setSeeded(true)
        toast({ title: 'Test accounts created', description: `${data.results.filter((r: { status: string }) => r.status === 'ok').length} accounts ready` })
      } else {
        throw new Error(data.error || 'Failed to seed')
      }
    } catch (error) {
      toast({ title: 'Error', description: error instanceof Error ? error.message : 'Failed to create test accounts', variant: 'destructive' })
    } finally {
      setSeeding(false)
    }
  }

  const handleTestLogin = async (email: string, password: string) => {
    setLoggingIn(email)
    try {
      await signInWithEmail(email, password)
      router.push('/dashboard')
    } catch {
      toast({
        title: 'Login failed',
        description: 'Create the test accounts first',
        variant: 'destructive',
      })
    } finally {
      setLoggingIn(null)
    }
  }

  return (
    <Card className="w-full max-w-md border-2 border-dashed border-amber-400 bg-amber-50 shadow-lg rounded-2xl mt-4">
      <CardHeader className="pb-2 pt-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <CardTitle className="text-sm font-bold text-amber-700 uppercase tracking-wider">
            Dev / Test Only
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        {!seeded && (
          <Button
            onClick={handleSeed}
            disabled={seeding}
            variant="outline"
            className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserCheck className="h-4 w-4 mr-2" />}
            {seeding ? 'Creating accounts...' : 'Create Test Accounts'}
          </Button>
        )}

        <div className="grid grid-cols-2 gap-2">
          {TEST_ACCOUNTS.map((account) => (
            <Button
              key={account.email}
              size="sm"
              variant="outline"
              disabled={loggingIn !== null}
              className="h-auto py-2 px-3 flex flex-col items-start text-left border-gray-300 bg-white hover:bg-gray-50"
              onClick={() => handleTestLogin(account.email, account.password)}
            >
              {loggingIn === account.email ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${account.color}`} />
                    <span className="font-semibold text-xs text-gray-900">{account.label}</span>
                  </span>
                  <span className="text-[10px] text-gray-500">{account.description}</span>
                </>
              )}
            </Button>
          ))}
        </div>

        {seeded && (
          <p className="text-[10px] text-amber-600 text-center">
            Accounts ready — click any role to log in
          </p>
        )}
      </CardContent>
    </Card>
  )
}
