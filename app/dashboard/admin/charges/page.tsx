'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/context'
import { apiGet } from '@/lib/api-client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowLeft, Building2, DollarSign, Receipt, User, Users } from 'lucide-react'

interface ChargeDetail {
  id: string
  businessId: string
  visitId: string
  offerId: string
  amount: number
  platformAmount: number
  referrerAmount: number
  consumerRewardAmount: number
  status: 'OWED' | 'PAID' | 'VOID'
  createdAt: string
  updatedAt: string
  paidAt: string | null
  visit: {
    consumerUserId: string
    referrerUserId: string
    status: string
    attributionType: string
    isNewCustomer: boolean
    receiptId: string | null
    createdAt: string
    updatedAt: string
  } | null
}

interface BusinessInfo {
  id: string
  name: string
  logo: string | null
}

export default function AdminChargesPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const businessId = searchParams.get('businessId')

  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState<BusinessInfo | null>(null)
  const [charges, setCharges] = useState<ChargeDetail[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!businessId || !user) return

    const fetchCharges = async () => {
      try {
        setLoading(true)
        const response = await apiGet<{ success: boolean; data: { business: BusinessInfo; charges: ChargeDetail[] } }>(`/api/admin/charges?businessId=${businessId}`)
        if (response.ok && response.data?.data) {
          setBusiness(response.data.data.business)
          setCharges(response.data.data.charges)
        } else {
          setError(response.error || 'Failed to load charges')
        }
      } catch {
        setError('Failed to load charges')
      } finally {
        setLoading(false)
      }
    }

    fetchCharges()
  }, [businessId, user])

  if (!businessId) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        {t('common.error')}
      </div>
    )
  }

  const totalOwed = charges.filter(c => c.status === 'OWED').reduce((sum, c) => sum + c.platformAmount, 0)
  const totalPaid = charges.filter(c => c.status === 'PAID').reduce((sum, c) => sum + c.platformAmount, 0)
  const totalAmount = charges.reduce((sum, c) => sum + c.platformAmount, 0)

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Back button + Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/admin')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          {business?.logo ? (
            <div className="h-12 w-12 rounded-xl overflow-hidden border border-border">
              <img src={business.logo} alt={business.name} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center border border-border">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{business?.name || t('common.loading')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('admin.chargeDetails', 'Charge details and payment history')}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">{t('common.loading')}</div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">{error}</div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('admin.totalCharges', 'Total')}</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
                <p className="text-xs text-muted-foreground">
                  {t('admin.chargeCount', '{{count}} charges', { count: charges.length })}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-600">{t('admin.totalOwed', 'Owed')}</CardTitle>
                <DollarSign className="h-4 w-4 text-red-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(totalOwed)}</div>
                <p className="text-xs text-muted-foreground">
                  {charges.filter(c => c.status === 'OWED').length} {t('admin.pendingCharges', 'pending')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-600">{t('admin.totalPaid', 'Paid')}</CardTitle>
                <DollarSign className="h-4 w-4 text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</div>
                <p className="text-xs text-muted-foreground">
                  {charges.filter(c => c.status === 'PAID').length} {t('admin.completedCharges', 'completed')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charges list */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-primary" />
                {t('admin.chargesList', 'All Charges')}
              </CardTitle>
              <CardDescription>
                {t('admin.chargesListDesc', 'Each charge corresponds to a converted visit')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {charges.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t('admin.noCharges', 'No charges found for this business')}
                </p>
              ) : (
                <div className="space-y-3">
                  {charges.map((charge) => (
                    <div
                      key={charge.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-border bg-muted/30 gap-3"
                    >
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {t('admin.chargeId', 'Charge')} #{charge.id.slice(0, 7).toUpperCase()}
                          </span>
                          <Badge variant={charge.status === 'PAID' ? 'default' : charge.status === 'OWED' ? 'destructive' : 'secondary'}>
                            {charge.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(new Date(charge.createdAt))}
                          {charge.paidAt && ` - ${t('admin.paidOn', 'Paid')} ${formatDate(new Date(charge.paidAt))}`}
                        </p>
                        {charge.visit && (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {t('admin.visitAttribution', 'Via')}: {charge.visit.attributionType === 'REFERRER' ? t('admin.promoter') : t('admin.platform')}
                            </span>
                            {charge.visit.isNewCustomer && (
                              <Badge variant="outline" className="text-[10px] py-0">
                                {t('admin.newCustomer', 'New Customer')}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-lg font-bold ${charge.status === 'OWED' ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(charge.platformAmount)}
                        </span>
                        <div className="text-[11px] text-muted-foreground text-right">
                          <span>{t('admin.totalCharge', 'Total')}: {formatCurrency(charge.amount)}</span>
                          {charge.referrerAmount > 0 && (
                            <span className="ml-2">{t('admin.referrerPortion', 'Promoter')}: {formatCurrency(charge.referrerAmount)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
