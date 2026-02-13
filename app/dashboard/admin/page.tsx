'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { apiGet, apiPost, apiPut } from '@/lib/api-client'
import type { Business, User, Visit, FraudFlag, Offer, ConsumerRewardType } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Building2,
  Users,
  UserCheck,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  TrendingUp,
  Gift,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface AdminDataResponse {
  businesses: Business[]
  users: User[]
  visits: Visit[]
  fraudFlags: FraudFlag[]
}

interface AdminStats {
  totalUsers: number
  totalBusinesses: number
  pendingBusinesses: number
  pendingReferrers: number
  totalVisits: number
  totalConversions: number
  totalRevenue: number
  unresolvedFraudFlags: number
}

export default function AdminDashboardPage() {
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const { t } = useTranslation()

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [fraudFlags, setFraudFlags] = useState<FraudFlag[]>([])
  const [offers, setOffers] = useState<Map<string, Offer>>(new Map())
  const [expandedBusiness, setExpandedBusiness] = useState<string | null>(null)
  const [commissionForm, setCommissionForm] = useState({
    referrerCommissionAmount: 0,
    consumerRewardType: 'none' as ConsumerRewardType,
    consumerRewardValue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [commissionSaving, setCommissionSaving] = useState(false)

  useEffect(() => {
    // Check if user is admin
    if (user && !user.roles.includes('admin')) {
      router.push('/dashboard')
      return
    }

    const fetchAdminData = async () => {
      if (!user) return

      try {
        // Fetch stats (uses auth token from API client)
        const statsResult = await apiGet<{ success: boolean; data: AdminStats }>('/api/admin/stats')
        if (statsResult.ok && statsResult.data?.success) {
          setStats(statsResult.data.data)
        }

        // Fetch admin data using API
        const dataResult = await apiGet<AdminDataResponse>('/api/admin/data')
        if (dataResult.ok && dataResult.data) {
          // Parse dates from API response
          const businessesList = dataResult.data.businesses.map((b) => ({
            ...b,
            createdAt: b.createdAt ? new Date(b.createdAt) : undefined,
            updatedAt: b.updatedAt ? new Date(b.updatedAt) : undefined,
          })) as Business[]

          const usersList = dataResult.data.users.map((u) => ({
            ...u,
            createdAt: u.createdAt ? new Date(u.createdAt) : undefined,
            updatedAt: u.updatedAt ? new Date(u.updatedAt) : undefined,
          })) as User[]

          const visitsList = dataResult.data.visits.map((v) => ({
            ...v,
            createdAt: v.createdAt ? new Date(v.createdAt) : undefined,
            updatedAt: v.updatedAt ? new Date(v.updatedAt) : undefined,
          })) as Visit[]

          const fraudList = dataResult.data.fraudFlags.map((f) => ({
            ...f,
            createdAt: f.createdAt ? new Date(f.createdAt) : undefined,
          })) as FraudFlag[]

          setBusinesses(businessesList)
          setUsers(usersList)
          setVisits(visitsList)
          setFraudFlags(fraudList)

          // Fetch offers for all businesses
          const offersResult = await apiGet<{ success: boolean; data: Offer[] }>('/api/offers')
          if (offersResult.ok && offersResult.data?.data) {
            const offersMap = new Map<string, Offer>()
            offersResult.data.data.forEach((offer: Offer) => {
              offersMap.set(offer.businessId, offer)
            })
            setOffers(offersMap)
          }
        }
      } catch (error) {
        console.error('Error fetching admin data:', error)
        toast({
          title: t('common.error'),
          description: t('admin.failedToLoad'),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAdminData()
  }, [user, router, toast, t])

  const handleBusinessAction = async (businessId: string, action: 'approve' | 'suspend') => {
    if (!user) return

    setActionLoading(businessId)
    try {
      const result = await apiPost<{ success: boolean; error?: string }>(
        `/api/admin/businesses/${businessId}/approve`,
        { action }
      )

      if (!result.ok) {
        throw new Error(result.error || t('admin.businessActionFailed', { action }))
      }

      // Update local state
      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === businessId
            ? { ...b, status: action === 'approve' ? 'active' : 'suspended' }
            : b
        )
      )

      toast({
        title: t('common.success'),
        description: t('admin.businessActionSuccess', { action }),
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('admin.businessActionFailed', { action })
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleReferrerAction = async (userId: string, action: 'approve' | 'suspend') => {
    if (!user) return

    setActionLoading(userId)
    try {
      const result = await apiPost<{ success: boolean; error?: string }>(
        `/api/admin/referrers/${userId}/approve`,
        { action }
      )

      if (!result.ok) {
        throw new Error(result.error || t('admin.promoterActionFailed', { action }))
      }

      // Update local state
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, referrerStatus: action === 'approve' ? 'active' : 'suspended' }
            : u
        )
      )

      // Refresh auth context user (important when admin approves themselves)
      await refreshUser()

      toast({
        title: t('common.success'),
        description: t('admin.promoterActionSuccess', { action }),
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('admin.promoterActionFailed', { action })
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleExpandBusiness = (businessId: string) => {
    if (expandedBusiness === businessId) {
      setExpandedBusiness(null)
      return
    }
    const offer = offers.get(businessId)
    if (offer) {
      setCommissionForm({
        referrerCommissionAmount: offer.referrerCommissionAmount || 0,
        consumerRewardType: offer.consumerRewardType || 'none',
        consumerRewardValue: offer.consumerRewardValue || 0,
      })
    }
    setExpandedBusiness(businessId)
  }

  const handleSaveCommission = async (businessId: string) => {
    setCommissionSaving(true)
    try {
      const result = await apiPut<{ success: boolean; error?: string }>(
        `/api/admin/offers/${businessId}/commission`,
        commissionForm
      )

      if (!result.ok) {
        throw new Error(result.error || t('admin.commissionSaveFailed'))
      }

      // Update local offers state
      setOffers((prev) => {
        const newMap = new Map(prev)
        const existing = newMap.get(businessId)
        if (existing) {
          newMap.set(businessId, {
            ...existing,
            ...commissionForm,
          })
        }
        return newMap
      })

      toast({
        title: t('common.success'),
        description: t('admin.commissionSaved'),
      })
      setExpandedBusiness(null)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('admin.commissionSaveFailed')
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setCommissionSaving(false)
    }
  }

  const referrers = users.filter((u) => u.roles.includes('referrer'))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user?.roles.includes('admin')) {
    return null
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('admin.title')}</h1>
          <p className="text-muted-foreground">
            {t('admin.subtitle')}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.totalUsers')}</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.businesses')}</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBusinesses}</div>
              <p className="text-xs text-muted-foreground">
                {t('admin.pendingApproval', { count: stats.pendingBusinesses })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.conversions')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalConversions}</div>
              <p className="text-xs text-muted-foreground">
                {t('admin.ofVisits', { count: stats.totalVisits })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.totalRevenue')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fraud Alerts */}
      {fraudFlags.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t('admin.fraudAlerts', { count: fraudFlags.length })}
            </CardTitle>
            <CardDescription>
              {t('admin.fraudAlertsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {fraudFlags.slice(0, 5).map((flag) => (
                <div
                  key={flag.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{flag.reason}</p>
                    <p className="text-sm text-muted-foreground">
                      Visit #{flag.visitId.slice(-6)} • {formatDate(flag.createdAt)}
                    </p>
                  </div>
                  <Badge variant="destructive">{t('admin.unresolved')}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="businesses">
        <TabsList>
          <TabsTrigger value="businesses">{t('admin.tabBusinesses')}</TabsTrigger>
          <TabsTrigger value="referrers">{t('admin.tabPromoters')}</TabsTrigger>
          <TabsTrigger value="users">{t('admin.tabUsers')}</TabsTrigger>
          <TabsTrigger value="visits">{t('admin.tabRecentVisits')}</TabsTrigger>
        </TabsList>

        <TabsContent value="businesses" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.allBusinesses')}</CardTitle>
              <CardDescription>
                {t('admin.manageBusinesses')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {businesses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t('admin.noBusinesses')}
                </p>
              ) : (
                <div className="divide-y">
                  {businesses.map((business) => {
                    const offer = offers.get(business.id)
                    const isExpanded = expandedBusiness === business.id
                    return (
                      <div key={business.id} className="py-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                              <Building2 className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-semibold break-words">{business.name}</h4>
                              <p className="text-sm text-muted-foreground break-words">
                                {business.category} • {business.address}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground">
                                  {t('admin.created', { date: formatDate(business.createdAt) })}
                                </p>
                                {offer ? (
                                  <Badge variant="outline" className="text-xs">
                                    <Gift className="h-3 w-3 mr-1" />
                                    {t('admin.hasOffer')} • {t('admin.pricePerCustomer')}: {formatCurrency(offer.pricePerNewCustomer)}
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs">
                                    {t('admin.noOffer')}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                business.status === 'active'
                                  ? 'success'
                                  : business.status === 'pending'
                                  ? 'warning'
                                  : 'destructive'
                              }
                            >
                              {business.status}
                            </Badge>

                            {business.status === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => handleBusinessAction(business.id, 'approve')}
                                disabled={actionLoading === business.id}
                              >
                                {actionLoading === business.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    {t('common.approve')}
                                  </>
                                )}
                              </Button>
                            )}

                            {business.status === 'active' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleBusinessAction(business.id, 'suspend')}
                                disabled={actionLoading === business.id}
                              >
                                {actionLoading === business.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 mr-1" />
                                    {t('common.suspend')}
                                  </>
                                )}
                              </Button>
                            )}

                            {business.status === 'suspended' && (
                              <Button
                                size="sm"
                                onClick={() => handleBusinessAction(business.id, 'approve')}
                                disabled={actionLoading === business.id}
                              >
                                {actionLoading === business.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    {t('common.reactivate')}
                                  </>
                                )}
                              </Button>
                            )}

                            {offer && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleExpandBusiness(business.id)}
                              >
                                <Settings className="h-4 w-4 mr-1" />
                                {t('admin.configureOffer')}
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4 ml-1" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 ml-1" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Expandable commission config */}
                        {isExpanded && offer && (
                          <div className="mt-4 ml-16 p-4 rounded-lg bg-muted/50 border space-y-4">
                            <div>
                              <h5 className="font-medium flex items-center gap-2">
                                <Gift className="h-4 w-4" />
                                {t('admin.offerCommission')}
                              </h5>
                              <p className="text-xs text-muted-foreground">
                                {t('admin.offerCommissionDesc')}
                              </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="space-y-2">
                                <Label>{t('admin.commissionAmount')}</Label>
                                <Input
                                  type="number"
                                  min="0"
                                  max={offer.pricePerNewCustomer}
                                  step="1"
                                  value={commissionForm.referrerCommissionAmount}
                                  onChange={(e) =>
                                    setCommissionForm({ ...commissionForm, referrerCommissionAmount: Number(e.target.value) })
                                  }
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>{t('admin.rewardType')}</Label>
                                <Select
                                  value={commissionForm.consumerRewardType}
                                  onValueChange={(value: ConsumerRewardType) =>
                                    setCommissionForm({ ...commissionForm, consumerRewardType: value })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">{t('admin.noReward')}</SelectItem>
                                    <SelectItem value="cash">{t('admin.cashBack')}</SelectItem>
                                    <SelectItem value="points">{t('admin.rewardPoints')}</SelectItem>
                                    <SelectItem value="discount">{t('admin.discount')}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {commissionForm.consumerRewardType !== 'none' && (
                                <div className="space-y-2">
                                  <Label>
                                    {t('admin.rewardValue')}
                                    {commissionForm.consumerRewardType === 'discount' ? ' (%)' : ' ($)'}
                                  </Label>
                                  <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={commissionForm.consumerRewardValue}
                                    onChange={(e) =>
                                      setCommissionForm({ ...commissionForm, consumerRewardValue: Number(e.target.value) })
                                    }
                                  />
                                </div>
                              )}
                            </div>

                            <div className="flex justify-end">
                              <Button
                                size="sm"
                                onClick={() => handleSaveCommission(business.id)}
                                disabled={commissionSaving}
                              >
                                {commissionSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                )}
                                {t('admin.saveCommission')}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                {t('admin.allPromoters')}
              </CardTitle>
              <CardDescription>
                {t('admin.managePromoters')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {referrers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t('admin.noPromoters')}
                </p>
              ) : (
                <div className="divide-y">
                  {referrers.map((referrer) => (
                    <div
                      key={referrer.id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <span className="font-semibold">
                            {referrer.name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold">{referrer.name}</h4>
                          <p className="text-sm text-muted-foreground">{referrer.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {t('admin.registered', { date: formatDate(referrer.createdAt) })}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            referrer.referrerStatus === 'active'
                              ? 'success'
                              : referrer.referrerStatus === 'pending'
                              ? 'warning'
                              : referrer.referrerStatus === 'suspended'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {referrer.referrerStatus || 'pending'}
                        </Badge>

                        {(!referrer.referrerStatus || referrer.referrerStatus === 'pending') && (
                          <Button
                            size="sm"
                            onClick={() => handleReferrerAction(referrer.id, 'approve')}
                            disabled={actionLoading === referrer.id}
                          >
                            {actionLoading === referrer.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {t('common.approve')}
                              </>
                            )}
                          </Button>
                        )}

                        {referrer.referrerStatus === 'active' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReferrerAction(referrer.id, 'suspend')}
                            disabled={actionLoading === referrer.id}
                          >
                            {actionLoading === referrer.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-1" />
                                {t('common.suspend')}
                              </>
                            )}
                          </Button>
                        )}

                        {referrer.referrerStatus === 'suspended' && (
                          <Button
                            size="sm"
                            onClick={() => handleReferrerAction(referrer.id, 'approve')}
                            disabled={actionLoading === referrer.id}
                          >
                            {actionLoading === referrer.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {t('common.reactivate')}
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.allUsers')}</CardTitle>
              <CardDescription>{t('admin.manageUsers')}</CardDescription>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t('admin.noUsers')}
                </p>
              ) : (
                <div className="divide-y">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="py-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <span className="font-semibold">
                            {u.name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold">{u.name}</h4>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {u.roles.map((role) => (
                          <Badge
                            key={role}
                            variant={role === 'admin' ? 'default' : 'secondary'}
                          >
                            {t('roles.' + (role === 'referrer' ? 'promoter' : role))}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visits" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.recentVisits')}</CardTitle>
              <CardDescription>
                {t('admin.allVisits')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {visits.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {t('admin.noVisits')}
                </p>
              ) : (
                <div className="divide-y">
                  {visits.slice(0, 20).map((visit) => {
                    const business = businesses.find((b) => b.id === visit.businessId)
                    return (
                      <div
                        key={visit.id}
                        className="py-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">
                            {t('admin.visitTo', { name: business?.name || t('common.unknown') })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {visit.attributionType === 'REFERRER' ? t('admin.promoter') : t('admin.platform')} •{' '}
                            {formatDate(visit.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!visit.isNewCustomer && (
                            <Badge variant="destructive">{t('common.repeat')}</Badge>
                          )}
                          <Badge
                            variant={
                              visit.status === 'CONVERTED'
                                ? 'success'
                                : visit.status === 'REJECTED'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {visit.status}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
