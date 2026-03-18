'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/lib/auth/context'
import { apiGet, apiPut } from '@/lib/api-client'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import {
  ChevronLeft,
  DollarSign,
  Loader2,
  Clock,
  TrendingUp,
  Landmark,
  Eye,
  EyeOff,
  Check,
} from 'lucide-react'

interface EarningsStats {
  totalEarnings: number
  pendingEarnings: number
  completedEarnings: number
  thisMonth: number
}

export default function CashoutPage() {
  const { user, refreshUser } = useAuth()
  const { t } = useTranslation()
  const { toast } = useToast()

  const [loadingStats, setLoadingStats] = useState(true)
  const [stats, setStats] = useState<EarningsStats>({
    totalEarnings: 0,
    pendingEarnings: 0,
    completedEarnings: 0,
    thisMonth: 0,
  })

  const [bankInfo, setBankInfo] = useState({
    bankName: '',
    accountHolderName: '',
    routingNumber: '',
    accountNumber: '',
    accountType: '' as 'checking' | 'savings' | '',
  })
  const [showAccountNumber, setShowAccountNumber] = useState(false)
  const [savingBank, setSavingBank] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return
      try {
        const result = await apiGet<{ success: boolean; stats: EarningsStats }>('/api/earnings')
        if (result.ok && result.data) {
          setStats(result.data.stats)
        }
      } catch (error) {
        console.error('Error fetching earnings:', error)
      } finally {
        setLoadingStats(false)
      }
    }
    fetchStats()
  }, [user])

  // Load existing bank info
  useEffect(() => {
    if (user?.bankInfo) {
      setBankInfo({
        bankName: user.bankInfo.bankName || '',
        accountHolderName: user.bankInfo.accountHolderName || '',
        routingNumber: user.bankInfo.routingNumber || '',
        accountNumber: user.bankInfo.accountNumber || '',
        accountType: user.bankInfo.accountType || '',
      })
    }
  }, [user?.bankInfo])

  const handleSaveBank = async () => {
    if (!bankInfo.bankName || !bankInfo.accountHolderName || !bankInfo.routingNumber || !bankInfo.accountNumber || !bankInfo.accountType) {
      toast({
        title: t('common.error'),
        description: t('cashout.bankRequired'),
        variant: 'destructive',
      })
      return
    }

    if (!/^\d{9}$/.test(bankInfo.routingNumber)) {
      toast({
        title: t('common.error'),
        description: t('cashout.invalidRouting'),
        variant: 'destructive',
      })
      return
    }

    if (!/^\d{4,17}$/.test(bankInfo.accountNumber)) {
      toast({
        title: t('common.error'),
        description: t('cashout.invalidAccount'),
        variant: 'destructive',
      })
      return
    }

    setSavingBank(true)
    try {
      const result = await apiPut<{ success: boolean }>('/api/users/bank-info', bankInfo)
      if (!result.ok) {
        throw new Error(result.error || 'Failed to save')
      }
      await refreshUser()
      toast({
        title: t('common.success'),
        description: t('cashout.bankSaved'),
      })
    } catch (error) {
      console.error('Error saving bank info:', error)
      toast({
        title: t('common.error'),
        description: t('cashout.bankSaveFailed'),
        variant: 'destructive',
      })
    } finally {
      setSavingBank(false)
    }
  }

  if (!user) return null

  if (loadingStats) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const hasBankInfo = user.bankInfo?.bankName && user.bankInfo?.accountNumber

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-6 py-8 rounded-2xl mx-4 mt-4 overflow-hidden" style={{ background: 'linear-gradient(to bottom right, var(--theme-gradientFrom), var(--theme-gradientTo))' }}>
        <div className="max-w-2xl mx-auto">
          <Link
            href="/dashboard/visits"
            className="inline-flex items-center gap-2 text-theme-textSecondary hover:text-theme-textPrimary mb-4 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span>{t('cashout.backToEarnings')}</span>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-theme-textPrimary mb-2">{t('cashout.title')}</h1>
          <p className="text-theme-textSecondary">{t('cashout.subtitle')}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card backdrop-blur-sm rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-sm text-muted-foreground">{t('cashout.availableBalance')}</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(stats.completedEarnings)}
            </p>
          </div>

          <div className="bg-card backdrop-blur-sm rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <span className="text-sm text-muted-foreground">{t('cashout.pendingBalance')}</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(stats.pendingEarnings)}
            </p>
          </div>
        </div>

        {/* Total Earnings */}
        <div className="bg-card backdrop-blur-sm rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)' }}>
              <TrendingUp className="h-6 w-6 text-theme-primary" />
            </div>
            <span className="text-sm text-muted-foreground">{t('earnings.totalEarnings')}</span>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {formatCurrency(stats.totalEarnings)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('cashout.thisMonthLabel')}: {formatCurrency(stats.thisMonth)}
          </p>
        </div>

        {/* Bank Information */}
        <div className="bg-card backdrop-blur-sm rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)' }}>
              <Landmark className="h-6 w-6 text-theme-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{t('cashout.bankInfoTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('cashout.bankInfoDesc')}</p>
            </div>
            {hasBankInfo && (
              <Check className="h-5 w-5 text-green-500 ml-auto" />
            )}
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="bankName">{t('cashout.bankName')}</Label>
              <Input
                id="bankName"
                value={bankInfo.bankName}
                onChange={(e) => setBankInfo({ ...bankInfo, bankName: e.target.value })}
                placeholder={t('cashout.bankNamePlaceholder')}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="accountHolderName">{t('cashout.accountHolder')}</Label>
              <Input
                id="accountHolderName"
                value={bankInfo.accountHolderName}
                onChange={(e) => setBankInfo({ ...bankInfo, accountHolderName: e.target.value })}
                placeholder={t('cashout.accountHolderPlaceholder')}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="accountType">{t('cashout.accountType')}</Label>
              <Select
                value={bankInfo.accountType}
                onValueChange={(value: 'checking' | 'savings') => setBankInfo({ ...bankInfo, accountType: value })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t('cashout.selectAccountType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">{t('cashout.checking')}</SelectItem>
                  <SelectItem value="savings">{t('cashout.savings')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="routingNumber">{t('cashout.routingNumber')}</Label>
              <Input
                id="routingNumber"
                value={bankInfo.routingNumber}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 9)
                  setBankInfo({ ...bankInfo, routingNumber: val })
                }}
                placeholder="123456789"
                maxLength={9}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="accountNumber">{t('cashout.accountNumber')}</Label>
              <div className="relative mt-1">
                <Input
                  id="accountNumber"
                  type={showAccountNumber ? 'text' : 'password'}
                  value={bankInfo.accountNumber}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 17)
                    setBankInfo({ ...bankInfo, accountNumber: val })
                  }}
                  placeholder="••••••••••"
                  maxLength={17}
                />
                <button
                  type="button"
                  onClick={() => setShowAccountNumber(!showAccountNumber)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showAccountNumber ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              onClick={handleSaveBank}
              disabled={savingBank}
              className="w-full h-11 rounded-xl font-semibold"
              style={{ background: 'var(--theme-primary)', color: '#111' }}
            >
              {savingBank ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.saving')}
                </>
              ) : hasBankInfo ? (
                t('cashout.updateBank')
              ) : (
                t('cashout.saveBank')
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
