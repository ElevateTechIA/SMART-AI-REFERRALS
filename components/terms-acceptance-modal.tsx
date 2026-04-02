'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { apiPost } from '@/lib/api-client'
import { Loader2, Shield, ExternalLink } from 'lucide-react'

export function TermsAcceptanceModal() {
  const { t } = useTranslation()
  const { refreshUser } = useAuth()
  const { toast } = useToast()
  const [accepting, setAccepting] = useState(false)

  const handleAccept = async () => {
    setAccepting(true)
    try {
      const result = await apiPost<{ success: boolean }>('/api/users/accept-terms', {})
      if (!result.ok) {
        throw new Error(result.error || 'Failed to accept terms')
      }
      await refreshUser()
    } catch (error) {
      console.error('Error accepting terms:', error)
      toast({
        title: t('common.error'),
        description: t('termsAcceptance.failedToAccept'),
        variant: 'destructive',
      })
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[var(--theme-cardBg,#ffffff)] rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-200">
        {/* Icon */}
        <div className="text-center mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'linear-gradient(to bottom right, var(--theme-gradientFrom), var(--theme-gradientTo))' }}
          >
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[var(--theme-textPrimary,#111827)] mb-2">
            {t('termsAcceptance.title')}
          </h2>
          <p className="text-sm text-[var(--theme-textMuted,#6b7280)]">
            {t('termsAcceptance.description')}
          </p>
        </div>

        {/* Terms Summary */}
        <div className="rounded-xl border border-[var(--theme-cardBorder,#e5e7eb)] bg-[var(--theme-surfaceVariant,#f3f4f6)] p-4 mb-6 max-h-48 overflow-y-auto">
          <p className="text-sm text-[var(--theme-textSecondary,#4b5563)] leading-relaxed">
            {t('termsAcceptance.summary')}
          </p>
        </div>

        {/* Read Full Terms Link */}
        <a
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-sm font-medium mb-6 transition-colors hover:opacity-80 text-[var(--theme-primary,#3b82f6)]"
        >
          <ExternalLink className="h-4 w-4" />
          {t('termsAcceptance.readFull')}
        </a>

        {/* Accept Button */}
        <Button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full h-12 text-base font-semibold rounded-xl"
        >
          {accepting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('common.loading')}
            </>
          ) : (
            t('termsAcceptance.accept')
          )}
        </Button>

        <p className="text-xs text-[var(--theme-textMuted,#9ca3af)] text-center mt-4">
          {t('termsAcceptance.disclaimer')}
        </p>
      </div>
    </div>
  )
}
