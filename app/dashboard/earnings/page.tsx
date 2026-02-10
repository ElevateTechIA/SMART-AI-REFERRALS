'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { apiGet } from '@/lib/api-client'
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  ChevronLeft,
  Clock,
  Loader2,
} from 'lucide-react'

interface Transaction {
  id: string
  date: string
  business: string
  customer: string
  amount: number
  status: 'completed' | 'pending' | 'processing'
  type: 'referral' | 'bonus'
  earningType?: string
  earningStatus?: string
  visitId?: string | null
  createdAt?: string | null
}

interface EarningsStats {
  totalEarnings: number
  pendingEarnings: number
  completedEarnings: number
  thisMonth: number
}

interface EarningsResponse {
  success: boolean
  stats: EarningsStats
  transactions: Transaction[]
}

export default function EarningsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [selectedPeriod, setSelectedPeriod] = useState('all')
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<EarningsStats>({
    totalEarnings: 0,
    pendingEarnings: 0,
    completedEarnings: 0,
    thisMonth: 0,
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])

  useEffect(() => {
    const fetchEarnings = async () => {
      if (!user) return

      try {
        setLoading(true)
        const result = await apiGet<EarningsResponse>(`/api/earnings?period=${selectedPeriod}`)

        if (!result.ok) {
          throw new Error(result.error || 'Failed to load earnings')
        }

        const data = result.data!
        setStats(data.stats)
        setTransactions(data.transactions)
      } catch (error) {
        console.error('Error fetching earnings:', error)
        toast({
          title: t('common.error'),
          description: t('earnings.failedToLoad'),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchEarnings()
  }, [user, selectedPeriod, toast, t])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: t('earnings.statusCompleted'), className: 'bg-green-500 text-white' },
      pending: { label: t('earnings.statusPending'), className: 'bg-yellow-500 text-white' },
      processing: { label: t('earnings.statusProcessing'), className: 'bg-blue-500 text-white' },
    }
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return <Badge className={config.className}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header with gradient matching dashboard */}
      <div className="bg-gradient-to-br from-blue-900 to-blue-700 px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors"
          >
            <ChevronLeft className="h-5 w-5" />
            <span>{t('common.backToDashboard')}</span>
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{t('earnings.title')}</h1>
          <p className="text-white/90">{t('earnings.subtitle')}</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards - matching dashboard style */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-sm text-gray-600">{t('earnings.totalEarnings')}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(stats.totalEarnings)}
            </p>
          </div>

          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-sm text-gray-600">{t('earnings.completed')}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(stats.completedEarnings)}
            </p>
          </div>

          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <span className="text-sm text-gray-600">{t('earnings.pending')}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(stats.pendingEarnings)}
            </p>
          </div>

          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <span className="text-sm text-gray-600">{t('earnings.thisMonth')}</span>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {formatCurrency(stats.thisMonth)}
            </p>
          </div>
        </div>

        {/* Transactions - matching dashboard card style */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <h2 className="text-xl font-bold text-gray-900">
                {t('earnings.transactionHistory')}
              </h2>
              <div className="flex gap-3">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">{t('earnings.allTime')}</option>
                  <option value="month">{t('earnings.thisMonthOption')}</option>
                  <option value="year">{t('earnings.thisYear')}</option>
                </select>
                <Button className="bg-blue-600 hover:bg-blue-700 rounded-lg">
                  <Download className="h-4 w-4 mr-2" />
                  {t('common.export')}
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('earnings.dateColumn')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('earnings.businessColumn')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('earnings.customerColumn')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('earnings.typeColumn')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('earnings.amountColumn')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('earnings.statusColumn')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {transaction.business}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {transaction.customer}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">
                      {transaction.type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(transaction.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {getStatusBadge(transaction.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {transactions.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">{t('earnings.noTransactions')}</p>
              <p className="text-sm text-gray-500 mt-2">
                {t('earnings.startPromoting')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
