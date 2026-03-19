'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { apiGet, apiPost, apiPut } from '@/lib/api-client'
import type { Business, User, Visit, FraudFlag, Offer, ConsumerRewardType, Receipt, SupportTicket } from '@/lib/types'

/** Safely render **bold** markdown as React elements (no dangerouslySetInnerHTML) */
function SafeBoldText({ text, boldColor, textColor }: { text: string; boldColor: string; textColor: string }) {
  const parts = text.split(/(\*\*.+?\*\*)/g)
  return (
    <span style={{ color: textColor }}>
      {parts.map((part, i) => {
        const match = part.match(/^\*\*(.+?)\*\*$/)
        if (match) return <strong key={i} style={{ color: boldColor }}>{match[1]}</strong>
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { DEFAULT_COMMISSION_SPLIT, type CommissionSplit } from '@/lib/commission-config'
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
  Receipt as ReceiptIcon,
  ExternalLink,
  CreditCard,
  ShoppingBag,
  Image,
  Search,
  Plus,
  X,
  HelpCircle,
  MessageSquare,
  Send,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react'

const ITEMS_PER_PAGE = 10

function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
  const { t } = useTranslation()
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between pt-4 border-t">
      <p className="text-sm text-muted-foreground">
        {t('admin.pageOf', { page, total: totalPages })}
      </p>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function SearchAndFilter({ search, onSearchChange, statusFilter, onStatusChange, statuses, searchPlaceholder }: {
  search: string; onSearchChange: (v: string) => void
  statusFilter: string; onStatusChange: (v: string) => void
  statuses: { value: string; label: string }[]
  searchPlaceholder: string
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
        {search && (
          <button onClick={() => onSearchChange('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="sm:w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('admin.allStatuses')}</SelectItem>
          {statuses.map((s) => (
            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface AdminDataResponse {
  businesses: Business[]
  users: User[]
  visits: Visit[]
  fraudFlags: FraudFlag[]
  receipts: Receipt[]
}

interface BusinessRevenue {
  businessId: string
  businessName: string
  businessLogo: string | null
  owed: number
  paid: number
  total: number
  chargeCount: number
}

interface ChargeDetail {
  id: string
  businessId: string
  visitId: string
  offerId: string
  amount: number
  platformAmount: number
  referrerAmount: number
  consumerRewardAmount: number
  status: 'OWED' | 'PARTIAL' | 'PAID' | 'VOID'
  paidAmount: number
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

interface ChargePayment {
  id: string
  chargeId: string
  amount: number
  method: string
  note: string | null
  registeredBy: string
  status: 'ACTIVE' | 'VOIDED'
  voidedAt: string | null
  createdAt: string
}

type PaymentMethod = 'TRANSFER' | 'ZELLE' | 'CASH' | 'CHECK' | 'OTHER'

interface AdminStats {
  totalUsers: number
  roleCounts: {
    admins: number
    businesses: number
    promoters: number
  }
  totalBusinesses: number
  businessCounts: {
    active: number
    pending: number
    suspended: number
  }
  pendingBusinesses: number
  pendingReferrers: number
  totalVisits: number
  totalConversions: number
  totalRevenue: number
  totalPaid: number
  totalOwed: number
  revenueByBusiness?: BusinessRevenue[]
  unresolvedFraudFlags: number
}

export default function AdminDashboardPage() {
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const initialTab = searchParams.get('tab') || 'businesses'

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [fraudFlags, setFraudFlags] = useState<FraudFlag[]>([])
  const [receipts, setReceipts] = useState<Map<string, Receipt>>(new Map())
  const [offers, setOffers] = useState<Map<string, Offer>>(new Map())
  const [expandedBusiness, setExpandedBusiness] = useState<string | null>(null)
  const [expandedVisit, setExpandedVisit] = useState<string | null>(null)
  const [commissionForm, setCommissionForm] = useState({
    referrerCommissionAmount: 0,
    consumerRewardType: 'none' as ConsumerRewardType,
    consumerRewardValue: 0,
  })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [commissionSaving, setCommissionSaving] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [roleLoading, setRoleLoading] = useState<string | null>(null)
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([])
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyLoading, setReplyLoading] = useState<string | null>(null)
  const [commissionSplit, setCommissionSplit] = useState<CommissionSplit>(DEFAULT_COMMISSION_SPLIT)
  const [splitForm, setSplitForm] = useState<CommissionSplit>(DEFAULT_COMMISSION_SPLIT)
  const [splitSaving, setSplitSaving] = useState(false)
  const [autoApproveUsers, setAutoApproveUsers] = useState(false)
  const [autoApproveSaving, setAutoApproveSaving] = useState(false)
  const [revenueFilter, setRevenueFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [selectedRevenueBiz, setSelectedRevenueBiz] = useState<string | null>(null)
  const [revenueBizCharges, setRevenueBizCharges] = useState<ChargeDetail[]>([])
  const [revenueBizChargesLoading, setRevenueBizChargesLoading] = useState(false)
  const [chargesCache, setChargesCache] = useState<Map<string, ChargeDetail[]>>(new Map())
  // Payment inline form state
  const [paymentFormChargeId, setPaymentFormChargeId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFER')
  const [paymentNote, setPaymentNote] = useState('')
  const [paymentSaving, setPaymentSaving] = useState(false)
  // Payment history
  const [expandedChargePayments, setExpandedChargePayments] = useState<string | null>(null)
  const [chargePayments, setChargePayments] = useState<ChargePayment[]>([])
  const [chargePaymentsLoading, setChargePaymentsLoading] = useState(false)
  const [voidingPayment, setVoidingPayment] = useState<string | null>(null)
  const [payAllBizSaving, setPayAllBizSaving] = useState(false)
  const [payAllMethod, setPayAllMethod] = useState<PaymentMethod>('TRANSFER')
  // Search, filter & pagination state per tab
  const [businessSearch, setBusinessSearch] = useState('')
  const [businessStatusFilter, setBusinessStatusFilter] = useState('all')
  const [businessPage, setBusinessPage] = useState(1)
  const [referrerSearch, setReferrerSearch] = useState('')
  const [referrerStatusFilter, setReferrerStatusFilter] = useState('all')
  const [referrerPage, setReferrerPage] = useState(1)
  const [userPage, setUserPage] = useState(1)
  const [visitSearch, setVisitSearch] = useState('')
  const [visitStatusFilter, setVisitStatusFilter] = useState('all')
  const [visitPage, setVisitPage] = useState(1)
  const [supportSearch, setSupportSearch] = useState('')
  const [supportStatusFilter, setSupportStatusFilter] = useState('all')
  const [supportPage, setSupportPage] = useState(1)

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

          // Build receipts map indexed by visitId
          const receiptsMap = new Map<string, Receipt>()
          if (dataResult.data.receipts) {
            dataResult.data.receipts.forEach((r) => {
              receiptsMap.set(r.visitId, {
                ...r,
                createdAt: r.createdAt ? new Date(r.createdAt) : undefined,
                updatedAt: r.updatedAt ? new Date(r.updatedAt) : undefined,
              } as Receipt)
            })
          }

          setBusinesses(businessesList)
          setUsers(usersList)
          setVisits(visitsList)
          setFraudFlags(fraudList)
          setReceipts(receiptsMap)

          // Fetch offers for all businesses
          const offersResult = await apiGet<{ success: boolean; data: Offer[] }>('/api/offers')
          if (offersResult.ok && offersResult.data?.data) {
            const offersMap = new Map<string, Offer>()
            offersResult.data.data.forEach((offer: Offer) => {
              offersMap.set(offer.businessId, offer)
            })
            setOffers(offersMap)
          }

          // Fetch support tickets
          const supportResult = await apiGet<{ tickets: SupportTicket[] }>('/api/admin/support')
          if (supportResult.ok && supportResult.data?.tickets) {
            setSupportTickets(
              supportResult.data.tickets.map((t) => ({
                ...t,
                createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
                updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date(),
                replies: (t.replies || []).map((r) => ({
                  ...r,
                  createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
                })),
              }))
            )
          }
        }

        // Fetch app settings (auto-approve flag)
        const appSettingsResult = await apiGet<{ success: boolean; data: { autoApproveUsers: boolean } }>('/api/admin/config/app-settings')
        if (appSettingsResult.ok && appSettingsResult.data?.success) {
          setAutoApproveUsers(appSettingsResult.data.data.autoApproveUsers)
        }
      } catch (error) {
        console.error('Error fetching admin data:', error)
        toast({
          title: t('common.error'),
          description: t('admin.failedToLoad'),
          variant: 'destructive',
        })
        // Fetch commission split config
        const splitResult = await apiGet<{ success: boolean; data: CommissionSplit }>('/api/admin/config/commission')
        if (splitResult.ok && splitResult.data?.success) {
          setCommissionSplit(splitResult.data.data)
          setSplitForm(splitResult.data.data)
        }
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
        referrerCommissionAmount: offer.referrerCommissionAmount || Math.round(offer.pricePerNewCustomer * 0.1 * 100) / 100,
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

  const handleSaveSplit = async () => {
    const total = splitForm.promoterPercent + splitForm.consumerPercent + splitForm.platformPercent
    if (total !== 100) {
      toast({
        title: t('common.error'),
        description: t('admin.splitMustSum100', { total }),
        variant: 'destructive',
      })
      return
    }
    setSplitSaving(true)
    try {
      const result = await apiPut<{ success: boolean; error?: string }>(
        '/api/admin/config/commission',
        splitForm
      )
      if (!result.ok) {
        throw new Error(result.error || 'Failed to save')
      }
      setCommissionSplit(splitForm)
      toast({
        title: t('common.success'),
        description: t('admin.splitSaved'),
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save'
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setSplitSaving(false)
    }
  }

  const handleToggleAutoApprove = async (checked: boolean) => {
    setAutoApproveSaving(true)
    try {
      const result = await apiPut<{ success: boolean; error?: string }>(
        '/api/admin/config/app-settings',
        { autoApproveUsers: checked }
      )
      if (!result.ok) {
        throw new Error(result.error || 'Failed to save')
      }
      setAutoApproveUsers(checked)
      toast({
        title: t('common.success'),
        description: t('admin.autoApproveUpdated'),
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save'
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setAutoApproveSaving(false)
    }
  }

  const handleToggleRole = async (userId: string, role: string, currentRoles: string[]) => {
    setRoleLoading(`${userId}-${role}`)
    try {
      const hasRole = currentRoles.includes(role)
      const newRoles = hasRole
        ? currentRoles.filter((r) => r !== role)
        : [...currentRoles, role]

      if (newRoles.length === 0) {
        toast({
          title: t('common.error'),
          description: t('admin.mustHaveOneRole'),
          variant: 'destructive',
        })
        return
      }

      const result = await apiPut<{ success: boolean; error?: string }>(
        `/api/admin/users/${userId}/roles`,
        { roles: newRoles }
      )

      if (!result.ok) {
        throw new Error(result.error || t('admin.roleUpdateFailed'))
      }

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, roles: newRoles as User['roles'] } : u
        )
      )

      toast({
        title: t('common.success'),
        description: t('admin.roleUpdateSuccess'),
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('admin.roleUpdateFailed')
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setRoleLoading(null)
    }
  }

  const handleSupportReply = async (ticketId: string, reply: string, newStatus?: string) => {
    setReplyLoading(ticketId)
    try {
      const body: Record<string, string | boolean> = { ticketId, read: true }
      if (reply.trim()) body.reply = reply.trim()
      if (newStatus) body.status = newStatus

      const result = await apiPut<{ success: boolean; error?: string }>(
        '/api/admin/support',
        body
      )

      if (!result.ok) {
        throw new Error(result.error || t('admin.replyFailed'))
      }

      setSupportTickets((prev) =>
        prev.map((t) => {
          if (t.id !== ticketId) return t
          const updated = { ...t, read: true, updatedAt: new Date() }
          if (newStatus) updated.status = newStatus as SupportTicket['status']
          if (reply.trim()) {
            const newReplyObj = {
              id: `reply_${Date.now()}`,
              message: reply.trim(),
              senderRole: 'admin' as const,
              senderUserId: user?.id || '',
              senderName: user?.name || 'Admin',
              createdAt: new Date(),
            }
            updated.replies = [...(t.replies || []), newReplyObj]
            updated.adminReply = reply.trim()
          }
          return updated
        })
      )

      setReplyText('')
      setExpandedTicket(null)
      toast({
        title: t('admin.replySent'),
        description: t('admin.replySentDesc'),
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('admin.replyFailed')
      toast({
        title: t('common.error'),
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setReplyLoading(null)
    }
  }

  const handleToggleRead = async (ticketId: string, currentRead: boolean) => {
    setReplyLoading(ticketId)
    try {
      const result = await apiPut<{ success: boolean; error?: string }>(
        '/api/admin/support',
        { ticketId, read: !currentRead }
      )
      if (!result.ok) throw new Error(result.error)
      setSupportTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, read: !currentRead } : t))
      )
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' })
    } finally {
      setReplyLoading(null)
    }
  }

  const allRoles = ['admin', 'business', 'referrer'] as const

  // --- Payment handlers ---
  const togglePaymentForm = (charge: ChargeDetail, fullPay = false) => {
    if (paymentFormChargeId === charge.id) {
      setPaymentFormChargeId(null)
      return
    }
    const remaining = charge.platformAmount - (charge.paidAmount || 0)
    setPaymentAmount(fullPay ? remaining.toFixed(2) : '')
    setPaymentMethod('TRANSFER')
    setPaymentNote('')
    setPaymentFormChargeId(charge.id)
  }

  const handleRegisterPayment = async (charge: ChargeDetail) => {
    if (!charge) return
    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      toast({ title: t('common.error'), description: t('admin.invalidAmount', 'Enter a valid amount'), variant: 'destructive' })
      return
    }
    const remaining = charge.platformAmount - (charge.paidAmount || 0)
    if (amount > remaining + 0.01) {
      toast({ title: t('common.error'), description: t('admin.amountExceedsBalance', 'Amount exceeds remaining balance of {{amount}}', { amount: formatCurrency(remaining) }), variant: 'destructive' })
      return
    }
    setPaymentSaving(true)
    try {
      const result = await apiPost<{ success: boolean; data: { newPaidAmount: number; newStatus: string; remaining: number } }>(`/api/admin/charges/${charge.id}/pay`, {
        amount,
        method: paymentMethod,
        note: paymentNote || null,
      })
      if (!result.ok) throw new Error(result.error || 'Failed to register payment')
      const { newPaidAmount, newStatus, remaining: newRemaining } = result.data!.data
      // Update local state
      const updatedCharge: ChargeDetail = { ...charge, paidAmount: newPaidAmount, status: newStatus as ChargeDetail['status'], paidAt: newStatus === 'PAID' ? new Date().toISOString() : charge.paidAt }
      setRevenueBizCharges(prev => prev.map(c => c.id === charge.id ? updatedCharge : c))
      setChargesCache(prev => {
        const next = new Map(prev)
        const bizCharges = next.get(charge.businessId)
        if (bizCharges) next.set(charge.businessId, bizCharges.map(c => c.id === charge.id ? updatedCharge : c))
        return next
      })
      setPaymentFormChargeId(null)
      toast({
        title: t('common.success'),
        description: newStatus === 'PAID'
          ? t('admin.chargeFullyPaid', 'Charge fully paid')
          : t('admin.paymentRegistered', 'Payment of {{amount}} registered — {{remaining}} remaining', { amount: formatCurrency(amount), remaining: formatCurrency(newRemaining) }),
      })
    } catch (error) {
      toast({ title: t('common.error'), description: error instanceof Error ? error.message : 'Failed', variant: 'destructive' })
    } finally {
      setPaymentSaving(false)
    }
  }

  const loadChargePayments = async (chargeId: string) => {
    if (expandedChargePayments === chargeId) {
      setExpandedChargePayments(null)
      setChargePayments([])
      return
    }
    setExpandedChargePayments(chargeId)
    setChargePaymentsLoading(true)
    try {
      const result = await apiGet<{ success: boolean; data: { payments: ChargePayment[] } }>(`/api/admin/charges/${chargeId}/payments`)
      if (result.ok && result.data?.data) {
        setChargePayments(result.data.data.payments)
      }
    } catch { /* ignore */ } finally {
      setChargePaymentsLoading(false)
    }
  }

  const handleVoidPayment = async (chargeId: string, paymentId: string, paymentAmount: number) => {
    setVoidingPayment(paymentId)
    try {
      const result = await apiPost<{ success: boolean; data: { newPaidAmount: number; newStatus: string; remaining: number } }>(`/api/admin/charges/${chargeId}/void-payment`, { paymentId })
      if (!result.ok) throw new Error(result.error || 'Failed to void payment')
      const { newPaidAmount, newStatus } = result.data!.data
      // Update charge in local state
      setRevenueBizCharges(prev => prev.map(c => c.id === chargeId ? { ...c, paidAmount: newPaidAmount, status: newStatus as ChargeDetail['status'], paidAt: null } : c))
      setChargesCache(prev => {
        const next = new Map(prev)
        Array.from(next.entries()).forEach(([bizId, charges]) => {
          const idx = charges.findIndex(c => c.id === chargeId)
          if (idx !== -1) {
            const updated = [...charges]
            updated[idx] = { ...updated[idx], paidAmount: newPaidAmount, status: newStatus as ChargeDetail['status'], paidAt: null }
            next.set(bizId, updated)
          }
        })
        return next
      })
      // Refresh payment list
      setChargePayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'VOIDED' as const, voidedAt: new Date().toISOString() } : p))
      toast({ title: t('common.success'), description: t('admin.paymentVoided', 'Payment voided — {{amount}} returned to balance', { amount: formatCurrency(paymentAmount) }) })
    } catch (error) {
      toast({ title: t('common.error'), description: error instanceof Error ? error.message : 'Failed', variant: 'destructive' })
    } finally {
      setVoidingPayment(null)
    }
  }

  const handlePayAllBusiness = async () => {
    const unpaidCharges = revenueBizCharges.filter(c => c.status !== 'PAID' && c.status !== 'VOID')
    if (unpaidCharges.length === 0) return
    setPayAllBizSaving(true)
    try {
      for (const charge of unpaidCharges) {
        const remaining = charge.platformAmount - (charge.paidAmount || 0)
        if (remaining <= 0.01) continue
        const result = await apiPost<{ success: boolean; data: { newPaidAmount: number; newStatus: string; remaining: number } }>(`/api/admin/charges/${charge.id}/pay`, {
          amount: remaining,
          method: payAllMethod,
          note: null,
        })
        if (!result.ok) throw new Error(result.error || `Failed to pay charge ${charge.id}`)
        const { newPaidAmount, newStatus } = result.data!.data
        const updatedCharge: ChargeDetail = { ...charge, paidAmount: newPaidAmount, status: newStatus as ChargeDetail['status'], paidAt: new Date().toISOString() }
        setRevenueBizCharges(prev => prev.map(c => c.id === charge.id ? updatedCharge : c))
        setChargesCache(prev => {
          const next = new Map(prev)
          const bizCharges = next.get(charge.businessId)
          if (bizCharges) next.set(charge.businessId, bizCharges.map(c => c.id === charge.id ? updatedCharge : c))
          return next
        })
      }
      toast({ title: t('common.success'), description: t('admin.allChargesPaid', 'All charges marked as paid') })
    } catch (error) {
      toast({ title: t('common.error'), description: error instanceof Error ? error.message : 'Failed', variant: 'destructive' })
    } finally {
      setPayAllBizSaving(false)
    }
  }

  // --- Filtered & paginated lists ---
  const filteredBusinesses = businesses.filter((b) => {
    const matchesStatus = businessStatusFilter === 'all' || b.status === businessStatusFilter
    if (!matchesStatus) return false
    if (!businessSearch) return true
    const s = businessSearch.toLowerCase()
    return b.name?.toLowerCase().includes(s) || b.category?.toLowerCase().includes(s) || b.address?.toLowerCase().includes(s)
  })
  const businessTotalPages = Math.max(1, Math.ceil(filteredBusinesses.length / ITEMS_PER_PAGE))
  const paginatedBusinesses = filteredBusinesses.slice((businessPage - 1) * ITEMS_PER_PAGE, businessPage * ITEMS_PER_PAGE)

  const referrers = users.filter((u) => u.roles.includes('referrer'))
  const filteredReferrers = referrers.filter((r) => {
    const status = r.referrerStatus || 'pending'
    const matchesStatus = referrerStatusFilter === 'all' || status === referrerStatusFilter
    if (!matchesStatus) return false
    if (!referrerSearch) return true
    const s = referrerSearch.toLowerCase()
    return r.name?.toLowerCase().includes(s) || r.email?.toLowerCase().includes(s)
  })
  const referrerTotalPages = Math.max(1, Math.ceil(filteredReferrers.length / ITEMS_PER_PAGE))
  const paginatedReferrers = filteredReferrers.slice((referrerPage - 1) * ITEMS_PER_PAGE, referrerPage * ITEMS_PER_PAGE)

  const filteredUsers = users.filter((u) => {
    if (!userSearch) return true
    const search = userSearch.toLowerCase()
    return (
      u.name?.toLowerCase().includes(search) ||
      u.email?.toLowerCase().includes(search)
    )
  })
  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE))
  const paginatedUsers = filteredUsers.slice((userPage - 1) * ITEMS_PER_PAGE, userPage * ITEMS_PER_PAGE)

  const filteredVisits = visits.filter((v) => {
    const matchesStatus = visitStatusFilter === 'all' || v.status === visitStatusFilter
    if (!matchesStatus) return false
    if (!visitSearch) return true
    const s = visitSearch.toLowerCase()
    const biz = businesses.find((b) => b.id === v.businessId)
    return biz?.name?.toLowerCase().includes(s) || false
  })
  const visitTotalPages = Math.max(1, Math.ceil(filteredVisits.length / ITEMS_PER_PAGE))
  const paginatedVisits = filteredVisits.slice((visitPage - 1) * ITEMS_PER_PAGE, visitPage * ITEMS_PER_PAGE)

  const filteredTickets = supportTickets.filter((t) => {
    const matchesStatus = supportStatusFilter === 'all' || t.status === supportStatusFilter
    if (!matchesStatus) return false
    if (!supportSearch) return true
    const s = supportSearch.toLowerCase()
    return t.subject?.toLowerCase().includes(s) || t.userName?.toLowerCase().includes(s) || t.userEmail?.toLowerCase().includes(s)
  })
  const supportTotalPages = Math.max(1, Math.ceil(filteredTickets.length / ITEMS_PER_PAGE))
  const paginatedTickets = filteredTickets.slice((supportPage - 1) * ITEMS_PER_PAGE, supportPage * ITEMS_PER_PAGE)

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
              <div className="mt-2 space-y-0.5">
                <p className="text-xs text-muted-foreground">
                  {t('roles.admin')}: {stats.roleCounts.admins}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('roles.business')}: {stats.roleCounts.businesses}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('roles.promoter')}: {stats.roleCounts.promoters}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.businesses')}</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBusinesses}</div>
              <div className="mt-2 space-y-0.5">
                <p className="text-xs text-green-600">
                  {t('common.active')}: {stats.businessCounts.active}
                </p>
                {stats.businessCounts.pending > 0 && (
                  <p className="text-xs text-yellow-600 font-medium">
                    {t('common.pending')}: {stats.businessCounts.pending}
                  </p>
                )}
                {stats.businessCounts.suspended > 0 && (
                  <p className="text-xs text-red-600">
                    {t('common.suspended')}: {stats.businessCounts.suspended}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.conversions')}</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalConversions}</div>
              <div className="mt-2 space-y-0.5">
                <p className="text-xs text-muted-foreground">
                  {t('admin.ofVisits', { count: stats.totalVisits })}
                </p>
                {stats.totalVisits > 0 && (
                  <p className="text-xs font-medium text-muted-foreground">
                    {t('admin.conversionRate')}: {Math.round((stats.totalConversions / stats.totalVisits) * 100)}%
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t('admin.totalRevenue')}</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
              <div className="mt-2 space-y-1">
                {stats.totalOwed > 0 ? (
                  <>
                    <p className="text-xs text-theme-error font-medium">
                      {t('admin.totalOwed')}: {formatCurrency(stats.totalOwed)}
                    </p>
                    <p className="text-xs text-green-600">
                      {t('admin.totalPaid')}: {formatCurrency(stats.totalPaid)}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    {stats.totalRevenue > 0 ? t('admin.allPaid') : ''}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Revenue Breakdown by Business */}
      {stats?.revenueByBusiness && stats.revenueByBusiness.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              {t('admin.revenueBreakdown', 'Revenue by Business')}
            </CardTitle>
            <CardDescription>
              {t('admin.revenueBreakdownDesc', 'Detailed breakdown of who owes and payment status')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filter buttons */}
            <div className="flex gap-2">
              {([['all', t('admin.allBusinesses', 'All')], ['pending', t('admin.pendingPayment', 'Pending')], ['paid', t('admin.fullyPaid', 'Paid')]] as const).map(([value, label]) => (
                <Button
                  key={value}
                  size="sm"
                  variant={revenueFilter === value ? 'default' : 'outline'}
                  className="h-8 text-xs"
                  onClick={() => setRevenueFilter(value as 'all' | 'pending' | 'paid')}
                >
                  {label}
                  <span className="ml-1.5 text-[10px] opacity-70">
                    ({value === 'all'
                      ? stats.revenueByBusiness!.length
                      : value === 'pending'
                        ? stats.revenueByBusiness!.filter(b => b.owed > 0).length
                        : stats.revenueByBusiness!.filter(b => b.owed === 0).length
                    })
                  </span>
                </Button>
              ))}
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory">
              {stats.revenueByBusiness
                .filter(biz => revenueFilter === 'all' ? true : revenueFilter === 'pending' ? biz.owed > 0 : biz.owed === 0)
                .map((biz) => (
                <div
                  key={biz.businessId}
                  className={`flex flex-col items-center text-center p-4 rounded-xl border transition-colors cursor-pointer w-[200px] flex-shrink-0 snap-start ${selectedRevenueBiz === biz.businessId ? 'border-foreground/40 bg-muted/60 ring-1 ring-foreground/20' : 'border-border bg-muted/30 hover:bg-muted/60'}`}
                  onClick={async () => {
                    if (selectedRevenueBiz === biz.businessId) {
                      setSelectedRevenueBiz(null)
                      setRevenueBizCharges([])
                      return
                    }
                    setSelectedRevenueBiz(biz.businessId)
                    const cached = chargesCache.get(biz.businessId)
                    if (cached) {
                      setRevenueBizCharges(cached)
                      return
                    }
                    setRevenueBizChargesLoading(true)
                    try {
                      const response = await apiGet<{ success: boolean; data: { charges: ChargeDetail[] } }>(`/api/admin/charges?businessId=${biz.businessId}`)
                      if (response.ok && response.data?.data) {
                        setRevenueBizCharges(response.data.data.charges)
                        setChargesCache(prev => new Map(prev).set(biz.businessId, response.data!.data.charges))
                      }
                    } catch { /* ignore */ } finally {
                      setRevenueBizChargesLoading(false)
                    }
                  }}
                >
                  {/* Business Logo */}
                  <div className="h-14 w-14 rounded-xl overflow-hidden bg-muted border border-border mb-2">
                    {biz.businessLogo ? (
                      <img
                        src={biz.businessLogo}
                        alt={biz.businessName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <p className="font-semibold text-sm text-foreground truncate w-full">{biz.businessName}</p>

                  {/* Total */}
                  <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(biz.total)}</p>

                  {/* Charge count */}
                  <p className="text-xs text-muted-foreground">
                    {t('admin.chargeCount', '{{count}} charges', { count: biz.chargeCount })}
                  </p>

                  {/* Owed / Paid */}
                  <div className="flex flex-col items-center gap-0.5 mt-1.5">
                    {biz.owed > 0 && (
                      <span className="text-xs font-medium text-theme-error">
                        {t('admin.owes', 'Owes')}: {formatCurrency(biz.owed)}
                      </span>
                    )}
                    {biz.paid > 0 && (
                      <span className="text-xs text-green-600">
                        {t('admin.paid', 'Paid')}: {formatCurrency(biz.paid)}
                      </span>
                    )}
                    {biz.owed === 0 && biz.paid > 0 && (
                      <CheckCircle className="h-3.5 w-3.5 text-green-600 mt-0.5" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Inline charge details */}
            {selectedRevenueBiz && (
              <div className="border-t pt-4">
                {revenueBizChargesLoading ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                    {t('common.loading')}
                  </div>
                ) : revenueBizCharges.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">
                    {t('admin.noCharges', 'No charges found for this business')}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {/* Summary bar */}
                    {(() => {
                      const totalPlatform = revenueBizCharges.reduce((s, c) => s + c.platformAmount, 0)
                      const totalPaidAmt = revenueBizCharges.reduce((s, c) => s + (c.paidAmount || 0), 0)
                      const pctPaid = totalPlatform > 0 ? Math.round((totalPaidAmt / totalPlatform) * 100) : 0
                      const totalOwed = totalPlatform - totalPaidAmt
                      const hasUnpaid = revenueBizCharges.some(c => c.status !== 'PAID' && c.status !== 'VOID')
                      return (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-muted/50">
                          <div className="flex items-center gap-4 text-sm flex-wrap">
                            <span className="font-medium">{revenueBizCharges.length} {t('admin.charges', 'charges')}</span>
                            <span className="text-muted-foreground">{t('admin.totalCharge', 'Total')}: {formatCurrency(totalPlatform)}</span>
                            <span className="text-theme-success font-medium">{t('admin.paid', 'Paid')}: {formatCurrency(totalPaidAmt)}</span>
                            <span className="text-theme-error font-medium">{t('admin.owes', 'Owes')}: {formatCurrency(totalOwed)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            {totalPlatform > 0 && (
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <div className="flex-1 h-2 rounded-full bg-muted">
                                  <div className="h-2 rounded-full bg-theme-success transition-all" style={{ width: `${pctPaid}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">{pctPaid}%</span>
                              </div>
                            )}
                            {hasUnpaid && (
                              <div className="flex items-center gap-1.5">
                                <Select value={payAllMethod} onValueChange={(v) => setPayAllMethod(v as PaymentMethod)}>
                                  <SelectTrigger className="h-8 w-[130px] text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {([['TRANSFER', 'Transferencia'], ['ZELLE', 'Zelle'], ['CASH', 'Efectivo'], ['CHECK', 'Cheque'], ['OTHER', 'Otro']] as const).map(([val, label]) => (
                                      <SelectItem key={val} value={val}>{label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button size="sm" className="h-8 text-xs" disabled={payAllBizSaving} onClick={handlePayAllBusiness}>
                                  {payAllBizSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle className="h-3 w-3 mr-1" />}
                                  {t('admin.payAll', 'Pay All')} — {formatCurrency(totalOwed)}
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })()}

                    {revenueBizCharges.map((charge) => {
                      const remaining = charge.platformAmount - (charge.paidAmount || 0)
                      const paidPct = charge.platformAmount > 0 ? Math.round(((charge.paidAmount || 0) / charge.platformAmount) * 100) : 0
                      const isExpanded = expandedChargePayments === charge.id

                      return (
                        <div key={charge.id} className={`rounded-xl border transition-colors ${charge.status === 'PAID' ? 'border-theme-success/30' : charge.status === 'PARTIAL' ? 'border-theme-warning/30' : 'border-border'} bg-background`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3">
                            {/* Left: info */}
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Color dot */}
                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${charge.status === 'PAID' ? 'bg-theme-success' : charge.status === 'PARTIAL' ? 'bg-theme-warning' : charge.status === 'VOID' ? 'bg-theme-secondary' : 'bg-theme-error'}`} />
                                <span className="font-medium text-sm">
                                  {t('admin.chargeId', 'Charge')} #{charge.id.slice(0, 7).toUpperCase()}
                                </span>
                                <Badge variant={charge.status === 'PAID' ? 'success' : charge.status === 'PARTIAL' ? 'warning' : charge.status === 'OWED' ? 'destructive' : 'secondary'}>
                                  {charge.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(new Date(charge.createdAt))}
                                {charge.paidAt && ` — ${t('admin.paidOn', 'Paid')} ${formatDate(new Date(charge.paidAt))}`}
                              </p>
                              {charge.visit && (
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <UserIcon className="h-3 w-3" />
                                    {t('admin.visitAttribution', 'Via')}: {charge.visit.attributionType === 'REFERRER' ? t('admin.promoter') : t('admin.platform')}
                                  </span>
                                  {charge.visit.isNewCustomer && (
                                    <Badge variant="outline" className="text-[10px] py-0">
                                      {t('admin.newCustomer', 'New Customer')}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              {/* Partial progress */}
                              {charge.status === 'PARTIAL' && (
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="w-32 h-1.5 rounded-full bg-muted">
                                    <div className="h-1.5 rounded-full bg-theme-warning transition-all" style={{ width: `${paidPct}%` }} />
                                  </div>
                                  <span className="text-[10px] text-theme-warning font-medium">
                                    {formatCurrency(charge.paidAmount || 0)} / {formatCurrency(charge.platformAmount)} ({paidPct}%)
                                  </span>
                                </div>
                              )}
                              <div className="text-[11px] text-muted-foreground space-x-2">
                                <span>{t('admin.totalCharge', 'Total')}: {formatCurrency(charge.amount)}</span>
                                {charge.referrerAmount > 0 && (
                                  <span>{t('admin.referrerPortion', 'Promoter')}: {formatCurrency(charge.referrerAmount)}</span>
                                )}
                                {charge.consumerRewardAmount > 0 && (
                                  <span>{t('admin.consumerReward', 'Reward')}: {formatCurrency(charge.consumerRewardAmount)}</span>
                                )}
                              </div>
                            </div>

                            {/* Right: amount + actions */}
                            <div className="flex flex-col items-end gap-2">
                              <div className="text-right">
                                <span className={`text-lg font-bold ${charge.status === 'PAID' ? 'text-theme-success' : charge.status === 'PARTIAL' ? 'text-theme-warning' : 'text-theme-error'}`}>
                                  {charge.status === 'PAID' ? formatCurrency(charge.platformAmount) : formatCurrency(remaining)}
                                </span>
                                <p className="text-[10px] text-muted-foreground">
                                  {charge.status === 'PAID' ? t('admin.paid', 'Paid') : t('admin.remaining', 'remaining')}
                                </p>
                              </div>
                              {/* Action buttons */}
                              {charge.status !== 'PAID' && charge.status !== 'VOID' && (
                                <div className="flex items-center gap-1.5">
                                  <Button size="sm" className="h-8 text-xs" onClick={() => togglePaymentForm(charge, true)}>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    {t('admin.markPaid', 'Mark Paid')}
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => togglePaymentForm(charge)}>
                                    <DollarSign className="h-3 w-3 mr-1" />
                                    {t('admin.partialPay', 'Partial')}
                                  </Button>
                                </div>
                              )}
                              {/* History toggle */}
                              {(charge.status === 'PARTIAL' || charge.status === 'PAID') && (
                                <Button size="sm" variant="ghost" className="h-7 text-[11px] text-muted-foreground" onClick={() => loadChargePayments(charge.id)}>
                                  {isExpanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                                  {t('admin.paymentHistory', 'History')}
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Expanded payment history */}
                          {isExpanded && (
                            <div className="border-t px-4 py-3 bg-muted/20">
                              {chargePaymentsLoading ? (
                                <div className="text-center py-4 text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" />
                                  <span className="text-xs">{t('common.loading')}</span>
                                </div>
                              ) : chargePayments.length === 0 ? (
                                <p className="text-center text-xs text-muted-foreground py-3">{t('admin.noPayments', 'No payments recorded')}</p>
                              ) : (
                                <div className="space-y-1.5">
                                  <div className="grid grid-cols-[1fr_80px_80px_1fr_80px] gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider px-2 pb-1">
                                    <span>{t('admin.date', 'Date')}</span>
                                    <span>{t('admin.amount', 'Amount')}</span>
                                    <span>{t('admin.method', 'Method')}</span>
                                    <span>{t('admin.note', 'Note')}</span>
                                    <span className="text-right">{t('admin.action', 'Action')}</span>
                                  </div>
                                  {chargePayments.map((payment) => (
                                    <div key={payment.id} className={`grid grid-cols-[1fr_80px_80px_1fr_80px] gap-2 items-center text-xs px-2 py-1.5 rounded-md ${payment.status === 'VOIDED' ? 'opacity-50 line-through bg-muted/30' : 'bg-background'}`}>
                                      <span className="text-foreground">{formatDateTime(new Date(payment.createdAt))}</span>
                                      <span className={payment.status === 'VOIDED' ? 'text-muted-foreground' : 'text-theme-success font-semibold'}>{formatCurrency(payment.amount)}</span>
                                      <Badge variant="outline" className="text-[9px] py-0 px-1.5 w-fit">{payment.method}</Badge>
                                      <span className="text-muted-foreground truncate">{payment.note || '—'}</span>
                                      <div className="text-right">
                                        {payment.status === 'ACTIVE' ? (
                                          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-theme-error hover:opacity-80 px-2" disabled={voidingPayment === payment.id} onClick={() => handleVoidPayment(charge.id, payment.id, payment.amount)}>
                                            {voidingPayment === payment.id ? <Loader2 className="h-3 w-3 animate-spin" /> : t('admin.void', 'Void')}
                                          </Button>
                                        ) : (
                                          <span className="text-[10px] text-muted-foreground">{t('admin.voided', 'Voided')}</span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Inline payment form */}
                          {paymentFormChargeId === charge.id && (() => {
                            const paidSoFar = charge.paidAmount || 0
                            const formRemaining = charge.platformAmount - paidSoFar
                            return (
                              <div className="border-t px-4 py-4 bg-muted/10 space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-sm font-semibold">{t('admin.registerPayment', 'Register Payment')}</h4>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setPaymentFormChargeId(null)}>
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>

                                {/* Summary */}
                                <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-muted/50 text-sm">
                                  <div>
                                    <p className="text-muted-foreground text-xs">{t('admin.platform', 'Platform')}</p>
                                    <p className="font-bold">{formatCurrency(charge.platformAmount)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground text-xs">{t('admin.paid', 'Paid')}</p>
                                    <p className="font-bold text-theme-success">{formatCurrency(paidSoFar)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground text-xs">{t('admin.remaining', 'Remaining')}</p>
                                    <p className="font-bold text-theme-error">{formatCurrency(formRemaining)}</p>
                                  </div>
                                </div>

                                {/* Amount */}
                                <div className="space-y-2">
                                  <Label>{t('admin.paymentAmount', 'Payment Amount')}</Label>
                                  <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                      type="number"
                                      step="0.01"
                                      min="0.01"
                                      max={formRemaining}
                                      placeholder="0.00"
                                      value={paymentAmount}
                                      onChange={(e) => setPaymentAmount(e.target.value)}
                                      className="pl-9"
                                    />
                                  </div>
                                  {/* Quick amounts */}
                                  <div className="flex gap-2 flex-wrap">
                                    {[25, 50, 75, 100].map(pct => {
                                      const val = Math.round(formRemaining * pct) / 100
                                      return (
                                        <Button key={pct} size="sm" variant={paymentAmount === val.toFixed(2) ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setPaymentAmount(val.toFixed(2))}>
                                          {pct}%
                                        </Button>
                                      )
                                    })}
                                  </div>
                                </div>

                                {/* Payment method */}
                                <div className="space-y-2">
                                  <Label>{t('admin.paymentMethod', 'Payment Method')}</Label>
                                  <div className="flex gap-2 flex-wrap">
                                    {([['TRANSFER', 'Transferencia'], ['ZELLE', 'Zelle'], ['CASH', 'Efectivo'], ['CHECK', 'Cheque'], ['OTHER', 'Otro']] as [PaymentMethod, string][]).map(([val, label]) => (
                                      <Button key={val} size="sm" variant={paymentMethod === val ? 'default' : 'outline'} className="h-8 text-xs" onClick={() => setPaymentMethod(val)}>
                                        {label}
                                      </Button>
                                    ))}
                                  </div>
                                </div>

                                {/* Note */}
                                <div className="space-y-2">
                                  <Label>{t('admin.note', 'Note')} <span className="text-muted-foreground">({t('common.optional', 'optional')})</span></Label>
                                  <Input
                                    placeholder={t('admin.paymentNotePlaceholder', 'e.g. Ref #12345')}
                                    value={paymentNote}
                                    onChange={(e) => setPaymentNote(e.target.value)}
                                  />
                                </div>

                                {/* Actions */}
                                <div className="flex items-center justify-end gap-2 pt-1">
                                  <Button variant="outline" size="sm" onClick={() => setPaymentFormChargeId(null)} disabled={paymentSaving}>
                                    {t('common.cancel', 'Cancel')}
                                  </Button>
                                  <Button size="sm" onClick={() => handleRegisterPayment(charge)} disabled={paymentSaving || !paymentAmount}>
                                    {paymentSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                                    {t('admin.registerPaymentBtn', 'Register Payment')} {paymentAmount ? `— ${formatCurrency(parseFloat(paymentAmount) || 0)}` : ''}
                                  </Button>
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
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
      <Tabs defaultValue={initialTab}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="w-max sm:w-auto">
            <TabsTrigger value="businesses">{t('admin.tabBusinesses')}</TabsTrigger>
            <TabsTrigger value="referrers">{t('admin.tabPromoters')}</TabsTrigger>
            <TabsTrigger value="users">{t('admin.tabUsers')}</TabsTrigger>
            <TabsTrigger value="visits">{t('admin.tabRecentVisits')}</TabsTrigger>
            <TabsTrigger value="support">
              {t('admin.tabSupport')}
              {supportTickets.filter((t) => t.status === 'open').length > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-5 min-w-5 px-1 text-[10px]">
                  {supportTickets.filter((t) => t.status === 'open').length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-1" />
              {t('admin.tabSettings')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="businesses" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.allBusinesses')}</CardTitle>
              <CardDescription>
                {t('admin.manageBusinesses')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SearchAndFilter
                search={businessSearch}
                onSearchChange={(v) => { setBusinessSearch(v); setBusinessPage(1) }}
                statusFilter={businessStatusFilter}
                onStatusChange={(v) => { setBusinessStatusFilter(v); setBusinessPage(1) }}
                statuses={[
                  { value: 'pending', label: t('common.pending') },
                  { value: 'active', label: t('common.active') },
                  { value: 'suspended', label: t('common.suspended') },
                ]}
                searchPlaceholder={t('admin.searchBusinessPlaceholder')}
              />
              {paginatedBusinesses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {businessSearch || businessStatusFilter !== 'all' ? t('common.noResults') : t('admin.noBusinesses')}
                </p>
              ) : (
                <div className="divide-y">
                  {paginatedBusinesses.map((business) => {
                    const offer = offers.get(business.id)
                    const isExpanded = expandedBusiness === business.id
                    return (
                      <div key={business.id} className="py-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 bg-muted border border-border">
                              {business.images?.[business.images.length - 1] ? (
                                <img src={business.images[business.images.length - 1]} alt={business.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Building2 className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
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
                                <p className="text-xs text-muted-foreground">
                                  {commissionSplit.promoterPercent}% = ${Math.floor(offer.pricePerNewCustomer * commissionSplit.promoterPercent / 100)}
                                </p>
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
                                  </SelectContent>
                                </Select>
                              </div>

                              {commissionForm.consumerRewardType !== 'none' && (
                                <div className="space-y-2">
                                  <Label>
                                    {t('admin.rewardValue')} ($)
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
                  <Pagination page={businessPage} totalPages={businessTotalPages} onPageChange={setBusinessPage} />
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
              <SearchAndFilter
                search={referrerSearch}
                onSearchChange={(v) => { setReferrerSearch(v); setReferrerPage(1) }}
                statusFilter={referrerStatusFilter}
                onStatusChange={(v) => { setReferrerStatusFilter(v); setReferrerPage(1) }}
                statuses={[
                  { value: 'pending', label: t('common.pending') },
                  { value: 'active', label: t('common.active') },
                  { value: 'suspended', label: t('common.suspended') },
                ]}
                searchPlaceholder={t('admin.searchPromoterPlaceholder')}
              />
              {paginatedReferrers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {referrerSearch || referrerStatusFilter !== 'all' ? t('common.noResults') : t('admin.noPromoters')}
                </p>
              ) : (
                <div className="divide-y">
                  {paginatedReferrers.map((referrer) => (
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
                  <Pagination page={referrerPage} totalPages={referrerTotalPages} onPageChange={setReferrerPage} />
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
              {/* Search bar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('admin.searchUsersPlaceholder')}
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setUserPage(1) }}
                  className="pl-9"
                />
                {userSearch && (
                  <button
                    onClick={() => { setUserSearch(''); setUserPage(1) }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {paginatedUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {userSearch ? t('common.noResults') : t('admin.noUsers')}
                </p>
              ) : (
                <div className="divide-y">
                  {paginatedUsers.map((u) => (
                    <div
                      key={u.id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
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
                      <div className="flex items-center gap-2 flex-wrap">
                        {allRoles.map((role) => {
                          const hasRole = u.roles.includes(role)
                          const isLoading = roleLoading === `${u.id}-${role}`
                          return (
                            <Badge
                              key={role}
                              variant={hasRole ? (role === 'admin' ? 'default' : 'secondary') : 'outline'}
                              className={`cursor-pointer select-none transition-colors ${
                                hasRole ? '' : 'opacity-50 hover:opacity-80'
                              }`}
                              onClick={() => !isLoading && handleToggleRole(u.id, role, u.roles as string[])}
                            >
                              {isLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : hasRole ? (
                                <X className="h-3 w-3 mr-1" />
                              ) : (
                                <Plus className="h-3 w-3 mr-1" />
                              )}
                              {t('roles.' + (role === 'referrer' ? 'promoter' : role))}
                            </Badge>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  <Pagination page={userPage} totalPages={userTotalPages} onPageChange={setUserPage} />
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
              <SearchAndFilter
                search={visitSearch}
                onSearchChange={(v) => { setVisitSearch(v); setVisitPage(1) }}
                statusFilter={visitStatusFilter}
                onStatusChange={(v) => { setVisitStatusFilter(v); setVisitPage(1) }}
                statuses={[
                  { value: 'CREATED', label: 'Created' },
                  { value: 'CHECKED_IN', label: 'Checked In' },
                  { value: 'CONVERTED', label: 'Converted' },
                  { value: 'REJECTED', label: 'Rejected' },
                ]}
                searchPlaceholder={t('admin.searchVisitPlaceholder')}
              />
              {paginatedVisits.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  {visitSearch || visitStatusFilter !== 'all' ? t('common.noResults') : t('admin.noVisits')}
                </p>
              ) : (
                <div className="divide-y">
                  {paginatedVisits.map((visit) => {
                    const business = businesses.find((b) => b.id === visit.businessId)
                    const receipt = receipts.get(visit.id)
                    const isVisitExpanded = expandedVisit === visit.id
                    return (
                      <div key={visit.id} className="py-3">
                        <div className="flex items-center justify-between">
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
                            {receipt && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs"
                                onClick={() => setExpandedVisit(isVisitExpanded ? null : visit.id)}
                              >
                                <ReceiptIcon className="h-3 w-3 mr-1" />
                                {t('admin.receiptLabel')}
                                {isVisitExpanded ? (
                                  <ChevronUp className="h-3 w-3 ml-1" />
                                ) : (
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                )}
                              </Button>
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

                        {/* Expandable receipt details */}
                        {isVisitExpanded && receipt && (
                          <div className="mt-3 p-4 rounded-lg bg-muted/50 border space-y-3">
                            <div className="flex items-center justify-between">
                              <h5 className="font-medium flex items-center gap-2 text-sm">
                                <ReceiptIcon className="h-4 w-4" />
                                {t('admin.receiptDetails')}
                              </h5>
                              <Badge
                                variant={
                                  receipt.status === 'EXTRACTED'
                                    ? 'success'
                                    : receipt.status === 'FAILED'
                                    ? 'destructive'
                                    : 'secondary'
                                }
                              >
                                {receipt.status}
                              </Badge>
                            </div>

                            {receipt.status === 'FAILED' && receipt.error && (
                              <p className="text-sm text-destructive">{receipt.error}</p>
                            )}

                            {receipt.extractedData && (
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                {receipt.extractedData.storeName && (
                                  <div>
                                    <p className="text-muted-foreground flex items-center gap-1">
                                      <ShoppingBag className="h-3 w-3" />
                                      {t('receipt.storeName')}
                                    </p>
                                    <p className="font-medium">{receipt.extractedData.storeName}</p>
                                  </div>
                                )}
                                {receipt.extractedData.date && (
                                  <div>
                                    <p className="text-muted-foreground">{t('receipt.date')}</p>
                                    <p className="font-medium">{receipt.extractedData.date}</p>
                                  </div>
                                )}
                                {receipt.extractedData.totalAmount != null && (
                                  <div>
                                    <p className="text-muted-foreground">{t('receipt.total')}</p>
                                    <p className="font-medium text-green-600 dark:text-green-400">
                                      {formatCurrency(receipt.extractedData.totalAmount)}
                                    </p>
                                  </div>
                                )}
                                {receipt.extractedData.subtotal != null && (
                                  <div>
                                    <p className="text-muted-foreground">{t('receipt.subtotal')}</p>
                                    <p className="font-medium">{formatCurrency(receipt.extractedData.subtotal)}</p>
                                  </div>
                                )}
                                {receipt.extractedData.tax != null && (
                                  <div>
                                    <p className="text-muted-foreground">{t('receipt.tax')}</p>
                                    <p className="font-medium">{formatCurrency(receipt.extractedData.tax)}</p>
                                  </div>
                                )}
                                {receipt.extractedData.tip != null && (
                                  <div>
                                    <p className="text-muted-foreground">{t('receipt.tip')}</p>
                                    <p className="font-medium">{formatCurrency(receipt.extractedData.tip)}</p>
                                  </div>
                                )}
                                {receipt.extractedData.paymentMethod && (
                                  <div>
                                    <p className="text-muted-foreground flex items-center gap-1">
                                      <CreditCard className="h-3 w-3" />
                                      {t('receipt.paymentMethod')}
                                    </p>
                                    <p className="font-medium">
                                      {receipt.extractedData.paymentMethod}
                                      {receipt.extractedData.lastFourDigits && ` ****${receipt.extractedData.lastFourDigits}`}
                                    </p>
                                  </div>
                                )}
                                {receipt.confidence != null && (
                                  <div>
                                    <p className="text-muted-foreground">{t('receipt.confidence')}</p>
                                    <Badge variant={receipt.confidence >= 0.8 ? 'success' : receipt.confidence >= 0.5 ? 'warning' : 'destructive'}>
                                      {Math.round(receipt.confidence * 100)}%
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Items list */}
                            {receipt.extractedData?.items && receipt.extractedData.items.length > 0 && (
                              <div>
                                <p className="text-sm text-muted-foreground mb-1">{t('receipt.items')} ({receipt.extractedData.items.length})</p>
                                <div className="bg-card rounded border p-2 max-h-40 overflow-y-auto">
                                  {receipt.extractedData.items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-xs py-0.5">
                                      <span className="text-foreground">{item.quantity && item.quantity > 1 ? `${item.quantity}x ` : ''}{item.name}</span>
                                      {item.price != null && <span className="text-muted-foreground">{formatCurrency(item.price)}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Receipt image thumbnail */}
                            {receipt.imageUrl && (
                              <a href={receipt.imageUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={receipt.imageUrl}
                                  alt="Receipt"
                                  className="w-full max-h-40 object-contain rounded border cursor-pointer hover:opacity-80 transition-opacity"
                                />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <Pagination page={visitPage} totalPages={visitTotalPages} onPageChange={setVisitPage} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="support" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                {t('admin.supportTickets')}
              </CardTitle>
              <CardDescription>
                {t('admin.manageSupportTickets')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SearchAndFilter
                search={supportSearch}
                onSearchChange={(v) => { setSupportSearch(v); setSupportPage(1) }}
                statusFilter={supportStatusFilter}
                onStatusChange={(v) => { setSupportStatusFilter(v); setSupportPage(1) }}
                statuses={[
                  { value: 'open', label: t('common.open') },
                  { value: 'resolved', label: t('common.resolved') },
                ]}
                searchPlaceholder={t('admin.searchSupportPlaceholder')}
              />
              {paginatedTickets.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    {supportSearch || supportStatusFilter !== 'all' ? t('common.noResults') : t('admin.noSupportTickets')}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {paginatedTickets.map((ticket) => {
                    const isExpanded = expandedTicket === ticket.id
                    return (
                      <div key={ticket.id} className="py-4">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm truncate">{ticket.subject}</h4>
                              <Badge variant={ticket.status === 'resolved' ? 'success' : 'warning'}>
                                {ticket.status}
                              </Badge>
                              {!ticket.read && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                  {t('admin.unread')}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {ticket.userName} ({ticket.userEmail}) &bull; {formatDate(ticket.createdAt)}
                            </p>
                            <div className="text-sm mt-2 leading-relaxed whitespace-pre-line">
                              <SafeBoldText text={ticket.message} boldColor="var(--theme-textPrimary)" textColor="var(--theme-textSecondary)" />
                            </div>
                            {/* Legacy single reply (backward compat) */}
                            {!ticket.replies?.length && ticket.adminReply && (
                              <div className="ml-4 mt-2 pl-3 border-l-2 border-primary/30 bg-muted/50 rounded-r-lg py-2 pr-3">
                                <span className="text-[10px] font-semibold text-foreground">
                                  {t('admin.reply')}
                                </span>
                                <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
                                  {ticket.adminReply}
                                </p>
                              </div>
                            )}
                            {/* Conversation thread */}
                            {ticket.replies?.map((reply) => (
                              <div
                                key={reply.id}
                                className={`mt-2 pl-3 border-l-2 rounded-r-lg py-2 pr-3 ${
                                  reply.senderRole === 'admin'
                                    ? 'ml-4 border-primary/30 bg-muted/50'
                                    : 'ml-0 border-yellow-400/40 bg-yellow-500/5'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-semibold text-foreground">
                                    {reply.senderRole === 'admin' ? t('admin.reply') : reply.senderName}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {formatDateTime(reply.createdAt)}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
                                  {reply.message}
                                </p>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {ticket.status === 'open' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSupportReply(ticket.id, '', 'resolved')}
                                disabled={replyLoading === ticket.id}
                              >
                                {replyLoading === ticket.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    {t('admin.markResolved')}
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSupportReply(ticket.id, '', 'open')}
                                disabled={replyLoading === ticket.id}
                              >
                                {replyLoading === ticket.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  t('admin.markOpen')
                                )}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleToggleRead(ticket.id, ticket.read ?? false)}
                              disabled={replyLoading === ticket.id}
                            >
                              {replyLoading === ticket.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                ticket.read ? t('admin.markUnread') : t('admin.markRead')
                              )}
                            </Button>
                            {ticket.status === 'open' && (
                              <Button
                                size="sm"
                                variant={isExpanded ? 'default' : 'outline'}
                                onClick={() => {
                                  setExpandedTicket(isExpanded ? null : ticket.id)
                                  setReplyText('')
                                }}
                              >
                                <Send className="h-4 w-4 mr-1" />
                                {t('admin.reply')}
                              </Button>
                            )}
                          </div>
                        </div>

                        {isExpanded && ticket.status === 'open' && (
                          <div className="mt-3 ml-0 md:ml-4 p-3 rounded-lg bg-muted/50 border space-y-3">
                            <textarea
                              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                              placeholder={t('admin.replyPlaceholder')}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleSupportReply(ticket.id, replyText)}
                                disabled={!replyText.trim() || replyLoading === ticket.id}
                              >
                                {replyLoading === ticket.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <Send className="h-4 w-4 mr-1" />
                                )}
                                {t('admin.sendReply')}
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSupportReply(ticket.id, replyText, 'resolved')}
                                disabled={!replyText.trim() || replyLoading === ticket.id}
                              >
                                {replyLoading === ticket.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                ) : (
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                )}
                                {t('admin.replyAndResolve')}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <Pagination page={supportPage} totalPages={supportTotalPages} onPageChange={setSupportPage} />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                {t('admin.autoApproveTitle')}
              </CardTitle>
              <CardDescription>
                {t('admin.autoApproveDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">{t('admin.autoApproveLabel')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('admin.autoApproveHint')}
                  </p>
                </div>
                <Switch
                  checked={autoApproveUsers}
                  onCheckedChange={handleToggleAutoApprove}
                  disabled={autoApproveSaving}
                />
              </div>
              {autoApproveUsers && (
                <div className="mt-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {t('admin.autoApproveWarning')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {t('admin.commissionSplitTitle')}
              </CardTitle>
              <CardDescription>
                {t('admin.commissionSplitDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t('admin.promoterPercent')}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={splitForm.promoterPercent}
                    onChange={(e) =>
                      setSplitForm({ ...splitForm, promoterPercent: Number(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground">{t('admin.promoterPercentDesc')}</p>
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.consumerPercent')}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={splitForm.consumerPercent}
                    onChange={(e) =>
                      setSplitForm({ ...splitForm, consumerPercent: Number(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground">{t('admin.consumerPercentDesc')}</p>
                </div>
                <div className="space-y-2">
                  <Label>{t('admin.platformPercent')}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={splitForm.platformPercent}
                    onChange={(e) =>
                      setSplitForm({ ...splitForm, platformPercent: Number(e.target.value) })
                    }
                  />
                  <p className="text-xs text-muted-foreground">{t('admin.platformPercentDesc')}</p>
                </div>
              </div>

              {splitForm.promoterPercent + splitForm.consumerPercent + splitForm.platformPercent !== 100 && (
                <p className="text-sm text-destructive font-medium">
                  {t('admin.splitMustSum100', { total: splitForm.promoterPercent + splitForm.consumerPercent + splitForm.platformPercent })}
                </p>
              )}

              <div className="rounded-lg bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium">{t('admin.splitPreview')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('admin.splitPreviewExample', {
                    promoter: Math.floor(100 * splitForm.promoterPercent / 100),
                    consumer: Math.floor(100 * splitForm.consumerPercent / 100),
                    platform: 100 - Math.floor(100 * splitForm.promoterPercent / 100) - Math.floor(100 * splitForm.consumerPercent / 100),
                  })}
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleSaveSplit}
                  disabled={splitSaving || splitForm.promoterPercent + splitForm.consumerPercent + splitForm.platformPercent !== 100}
                >
                  {splitSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-1" />
                  )}
                  {t('admin.saveSplit')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  )
}
