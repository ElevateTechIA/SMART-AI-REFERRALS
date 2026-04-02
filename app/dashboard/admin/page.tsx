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
import { apiGet, apiPost, apiPut, apiUpload } from '@/lib/api-client'
import type { Business, User, Visit, FraudFlag, Offer, ConsumerRewardType, Receipt, SupportTicket, AdminPermission } from '@/lib/types'
import { FULL_ADMIN_ONLY_TABS } from '@/lib/types'
import { DateFilter, filterByDate, type DateRange } from '@/components/list-controls'
import { useTheme } from '@/lib/theme/theme-provider'
import { BusinessCalendar } from '@/components/dashboard/business-calendar'

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
  Check,
  Paperclip,
  FileText,
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
  paidAmount: number
  status: 'OWED' | 'PAID' | 'PARTIAL' | 'VOID'
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

type PaymentMethod = 'CASH' | 'TRANSFER' | 'ZELLE' | 'CHECK' | 'OTHER'

interface ChargePayment {
  id: string
  chargeId: string
  businessId: string
  amount: number
  method: string
  note: string
  receiptUrl?: string
  status: 'COMPLETED' | 'VOIDED'
  createdAt: string
  createdBy: string
}

interface PaymentBatch {
  id: string
  businessId: string
  totalAmount: number
  method: string
  note: string
  receiptUrl: string | null
  chargeIds: string[]
  status: string
  createdAt: string
  createdBy: string
}

interface AdminPayoutRequest {
  id: string
  userId: string
  userName: string
  userEmail: string
  amount: number
  earningIds: string[]
  status: 'REQUESTED' | 'PROCESSING' | 'COMPLETED' | 'REJECTED'
  paymentMethod: string | null
  adminNote: string | null
  processedBy: string | null
  hasBankInfo: boolean
  bankLast4: string | null
  bankName: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

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
  const { theme } = useTheme()
  // Admin permissions: empty/undefined = full admin, otherwise limited
  const isFullAdmin = !user?.adminPermissions || user.adminPermissions.length === 0
  const hasPermission = (tab: string) => {
    if (isFullAdmin) return true
    if (FULL_ADMIN_ONLY_TABS.includes(tab as typeof FULL_ADMIN_ONLY_TABS[number])) return false
    return user?.adminPermissions?.includes(tab as AdminPermission) ?? false
  }
  const allowedTabs = ['businesses', 'referrers', 'users', 'visits', 'support', 'payouts', 'settings'].filter(hasPermission)
  const initialTab = searchParams.get('tab') || allowedTabs[0] || 'businesses'

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
  const [autoApproveBusinesses, setAutoApproveBusinesses] = useState(false)
  const [autoApproveReferrers, setAutoApproveReferrers] = useState(false)
  const [autoApproveSaving, setAutoApproveSaving] = useState(false)
  const [selectedRevenueBiz, setSelectedRevenueBiz] = useState<string | null>(null)
  const [revenueBizCharges, setRevenueBizCharges] = useState<ChargeDetail[]>([])
  const [revenueBizChargesLoading, setRevenueBizChargesLoading] = useState(false)
  const [chargesCache, setChargesCache] = useState<Map<string, ChargeDetail[]>>(new Map())
  const [paymentBatches, setPaymentBatches] = useState<PaymentBatch[]>([])
  // Payment inline form state
  const [payingChargeId, setPayingChargeId] = useState<string | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('TRANSFER')
  const [paymentNote, setPaymentNote] = useState('')
  const [paymentSaving, setPaymentSaving] = useState(false)
  const [paymentFile, setPaymentFile] = useState<File | null>(null)
  // Payment history
  const [expandedChargePayments, setExpandedChargePayments] = useState<string | null>(null)
  const [chargePayments, setChargePayments] = useState<ChargePayment[]>([])
  const [chargePaymentsLoading, setChargePaymentsLoading] = useState(false)
  const [voidingPayment, setVoidingPayment] = useState<string | null>(null)
  // Pay All
  const [payAllBizSaving, setPayAllBizSaving] = useState(false)
  const [payAllMethod, setPayAllMethod] = useState<PaymentMethod>('TRANSFER')
  const [payAllNote, setPayAllNote] = useState('')
  const [payAllFile, setPayAllFile] = useState<File | null>(null)
  // Revenue filter
  const [revenueFilter, setRevenueFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [chargesDateRange, setChargesDateRange] = useState<DateRange>('all')
  const [chargesStartDate, setChargesStartDate] = useState('')
  const [chargesEndDate, setChargesEndDate] = useState('')
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<Date | null>(null)
  // Admin payouts
  const [adminPayouts, setAdminPayouts] = useState<AdminPayoutRequest[]>([])
  const [payoutSearch, setPayoutSearch] = useState('')
  const [payoutStatusFilter, setPayoutStatusFilter] = useState('all')
  const [payoutPage, setPayoutPage] = useState(1)
  const [payoutProcessing, setPayoutProcessing] = useState<string | null>(null)
  const [payoutMethod, setPayoutMethod] = useState<PaymentMethod>('TRANSFER')
  const [payoutNote, setPayoutNote] = useState('')
  const [expandedPayoutId, setExpandedPayoutId] = useState<string | null>(null)
  // Pending earnings for approval
  const [pendingEarnings, setPendingEarnings] = useState<Array<{ id: string; userId: string; userName: string; businessId: string; businessName: string; amount: number; type: string; createdAt: string }>>([])
  const [approvingEarnings, setApprovingEarnings] = useState(false)
  const [pendingEarningsPage, setPendingEarningsPage] = useState(1)
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

        // Fetch pending earnings
        const earningsResult = await apiGet<{ success: boolean; data: Array<{ id: string; userId: string; userName: string; businessId: string; businessName: string; amount: number; type: string; createdAt: string }> }>('/api/admin/earnings?status=PENDING')
        if (earningsResult.ok && earningsResult.data?.data) {
          setPendingEarnings(earningsResult.data.data)
        }

        // Fetch payout requests
        const payoutsResult = await apiGet<{ success: boolean; data: AdminPayoutRequest[] }>('/api/admin/payouts')
        if (payoutsResult.ok && payoutsResult.data?.data) {
          setAdminPayouts(payoutsResult.data.data)
        }

        // Fetch app settings (auto-approve flag)
        const appSettingsResult = await apiGet<{ success: boolean; data: { autoApproveBusinesses: boolean; autoApproveReferrers: boolean } }>('/api/admin/config/app-settings')
        if (appSettingsResult.ok && appSettingsResult.data?.success) {
          setAutoApproveBusinesses(appSettingsResult.data.data.autoApproveBusinesses)
          setAutoApproveReferrers(appSettingsResult.data.data.autoApproveReferrers)
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

  const handleToggleAutoApprove = async (field: 'autoApproveBusinesses' | 'autoApproveReferrers', checked: boolean) => {
    setAutoApproveSaving(true)
    try {
      const result = await apiPut<{ success: boolean; error?: string }>(
        '/api/admin/config/app-settings',
        { [field]: checked }
      )
      if (!result.ok) {
        throw new Error(result.error || 'Failed to save')
      }
      if (field === 'autoApproveBusinesses') setAutoApproveBusinesses(checked)
      if (field === 'autoApproveReferrers') setAutoApproveReferrers(checked)
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

  const handleToggleAdminPermission = async (userId: string, permission: AdminPermission, currentPermissions: AdminPermission[]) => {
    setRoleLoading(`${userId}-perm-${permission}`)
    try {
      const hasIt = currentPermissions.includes(permission)
      const newPermissions = hasIt
        ? currentPermissions.filter((p) => p !== permission)
        : [...currentPermissions, permission]

      const result = await apiPut<{ success: boolean; error?: string }>(
        `/api/admin/users/${userId}/roles`,
        { adminPermissions: newPermissions }
      )

      if (!result.ok) throw new Error(result.error || 'Failed to update permissions')

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, adminPermissions: newPermissions } : u
        )
      )

      toast({
        title: t('common.success'),
        description: t('admin.permissionsUpdated'),
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update'
      toast({ title: t('common.error'), description: errorMessage, variant: 'destructive' })
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

  // --- Payment handlers ---
  const handleRegisterPayment = async (charge: ChargeDetail) => {
    const remaining = charge.platformAmount - (charge.paidAmount || 0)
    if (remaining <= 0) {
      toast({ title: t('admin.chargeAlreadyPaid', 'This charge is already fully paid'), variant: 'destructive' })
      setPayingChargeId(null)
      return
    }
    const amt = parseFloat(paymentAmount)
    if (isNaN(amt) || amt <= 0) {
      toast({ title: t('admin.invalidAmount', 'Invalid amount'), variant: 'destructive' })
      return
    }
    if (amt > remaining + 0.01) {
      toast({ title: t('admin.amountExceedsBalance', 'Amount exceeds remaining balance'), variant: 'destructive' })
      return
    }
    setPaymentSaving(true)
    try {
      let res
      if (paymentFile) {
        const formData = new FormData()
        formData.append('amount', String(amt))
        formData.append('method', paymentMethod)
        formData.append('note', paymentNote)
        formData.append('file', paymentFile)
        res = await apiUpload<{ success: boolean; data: { newPaidAmount: number; newStatus: string; paidAt: string | null; earningsApproved: number } }>(
          `/api/admin/charges/${charge.id}/pay`, formData
        )
      } else {
        res = await apiPost<{ success: boolean; data: { newPaidAmount: number; newStatus: string; paidAt: string | null; earningsApproved: number } }>(
          `/api/admin/charges/${charge.id}/pay`,
          { amount: amt, method: paymentMethod, note: paymentNote }
        )
      }
      if (res.ok && res.data?.success) {
        const updated = { ...charge, paidAmount: res.data.data.newPaidAmount, status: res.data.data.newStatus as ChargeDetail['status'], paidAt: res.data.data.paidAt }
        setRevenueBizCharges(prev => prev.map(c => c.id === charge.id ? updated : c))
        // Update cache
        setChargesCache(prev => {
          const next = new Map(prev)
          const cached = next.get(charge.businessId)
          if (cached) next.set(charge.businessId, cached.map(c => c.id === charge.id ? updated : c))
          return next
        })
        // Update stats
        if (stats) {
          setStats({
            ...stats,
            revenueByBusiness: stats.revenueByBusiness?.map(b =>
              b.businessId === charge.businessId ? { ...b, paid: b.paid + amt, owed: Math.max(0, b.owed - amt) } : b
            ),
          })
        }
        setPayingChargeId(null)
        setPaymentAmount('')
        setPaymentMethod('TRANSFER')
        setPaymentNote('')
        setPaymentFile(null)
        const approved = res.data.data.earningsApproved || 0
        toast({
          title: t('admin.paymentRegistered', 'Payment registered'),
          description: approved > 0 ? t('admin.earningsAutoApproved', '{{count}} earnings auto-approved', { count: approved }) : undefined,
        })
      }
    } catch { /* ignore */ } finally {
      setPaymentSaving(false)
    }
  }

  const loadChargePayments = async (chargeId: string) => {
    if (expandedChargePayments === chargeId) {
      setExpandedChargePayments(null)
      return
    }
    setExpandedChargePayments(chargeId)
    setChargePaymentsLoading(true)
    try {
      const res = await apiGet<{ success: boolean; data: ChargePayment[] }>(`/api/admin/charges/${chargeId}/payments`)
      if (res.ok && res.data?.data) {
        setChargePayments(res.data.data)
      }
    } catch { /* ignore */ } finally {
      setChargePaymentsLoading(false)
    }
  }

  const handleVoidPayment = async (chargeId: string, paymentId: string) => {
    setVoidingPayment(paymentId)
    try {
      const res = await apiPost<{ success: boolean; data: { newPaidAmount: number; newStatus: string } }>(
        `/api/admin/charges/${chargeId}/void-payment`,
        { paymentId }
      )
      if (res.ok && res.data?.success) {
        setChargePayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'VOIDED' } : p))
        const charge = revenueBizCharges.find(c => c.id === chargeId)
        if (charge) {
          const updated = { ...charge, paidAmount: res.data.data.newPaidAmount, status: res.data.data.newStatus as ChargeDetail['status'] }
          if (updated.status !== 'PAID') (updated as Record<string, unknown>).paidAt = null
          setRevenueBizCharges(prev => prev.map(c => c.id === chargeId ? updated : c))
          setChargesCache(prev => {
            const next = new Map(prev)
            const cached = next.get(charge.businessId)
            if (cached) next.set(charge.businessId, cached.map(c => c.id === chargeId ? updated : c))
            return next
          })
          const voidedPayment = chargePayments.find(p => p.id === paymentId)
          if (stats && voidedPayment) {
            setStats({
              ...stats,
              revenueByBusiness: stats.revenueByBusiness?.map(b =>
                b.businessId === charge.businessId ? { ...b, paid: Math.max(0, b.paid - voidedPayment.amount), owed: b.owed + voidedPayment.amount } : b
              ),
            })
          }
        }
        toast({ title: t('admin.paymentVoided', 'Payment voided') })
      }
    } catch { /* ignore */ } finally {
      setVoidingPayment(null)
    }
  }

  const handlePayAllBiz = async (businessId: string) => {
    const dateFiltered = filterByDate(revenueBizCharges, chargesDateRange, (c) => c.createdAt, chargesStartDate, chargesEndDate)
    const owedCharges = dateFiltered.filter(c => c.status === 'OWED' || c.status === 'PARTIAL')
    if (owedCharges.length === 0) return
    setPayAllBizSaving(true)
    try {
      let failed = 0
      const noteText = payAllNote || t('admin.payAll', 'Pay All')
      const paidChargeIds: string[] = []
      let totalPaidAmount = 0

      for (const charge of owedCharges) {
        const remaining = charge.platformAmount - (charge.paidAmount || 0)
        if (remaining <= 0) continue
        const res = await apiPost(`/api/admin/charges/${charge.id}/pay`, { amount: remaining, method: payAllMethod, note: noteText })
        if (!res.ok) { failed++ } else {
          paidChargeIds.push(charge.id)
          totalPaidAmount += remaining
        }
      }

      // Create payment batch with optional receipt (global for this Pay All)
      if (paidChargeIds.length > 0) {
        if (payAllFile) {
          const formData = new FormData()
          formData.append('businessId', businessId)
          formData.append('totalAmount', String(totalPaidAmount))
          formData.append('method', payAllMethod)
          formData.append('note', noteText)
          formData.append('chargeIds', JSON.stringify(paidChargeIds))
          formData.append('file', payAllFile)
          await apiUpload('/api/admin/payment-batches', formData)
        } else {
          await apiPost('/api/admin/payment-batches', {
            businessId, totalAmount: totalPaidAmount, method: payAllMethod, note: noteText, chargeIds: paidChargeIds,
          })
        }
      }
      // Reset Pay All fields and close any open individual payment form
      setPayAllNote('')
      setPayAllFile(null)
      setPayingChargeId(null)
      // Reload charges and batches for this business
      const [chargesRes, batchesRes] = await Promise.all([
        apiGet<{ success: boolean; data: { charges: ChargeDetail[] } }>(`/api/admin/charges?businessId=${businessId}`),
        apiGet<{ success: boolean; data: PaymentBatch[] }>(`/api/admin/payment-batches?businessId=${businessId}`),
      ])
      if (chargesRes.ok && chargesRes.data?.data) {
        setRevenueBizCharges(chargesRes.data.data.charges)
        setChargesCache(prev => new Map(prev).set(businessId, chargesRes.data!.data.charges))
      }
      if (batchesRes.ok && batchesRes.data?.data) {
        setPaymentBatches(batchesRes.data.data)
      }
      // Reload stats and pending earnings
      const [statsResult, earningsResult] = await Promise.all([
        apiGet<{ success: boolean; data: AdminStats }>('/api/admin/stats'),
        apiGet<{ success: boolean; data: typeof pendingEarnings }>('/api/admin/earnings?status=PENDING'),
      ])
      if (statsResult.ok && statsResult.data?.success) setStats(statsResult.data.data)
      if (earningsResult.ok && earningsResult.data?.data) setPendingEarnings(earningsResult.data.data)
      if (failed > 0) {
        toast({ title: t('admin.somePaymentsFailed', 'Some payments failed'), description: `${failed} ${t('admin.failed', 'failed')}`, variant: 'destructive' })
      } else {
        toast({ title: t('admin.chargeFullyPaid', 'All charges marked as paid') })
      }
    } catch { /* ignore */ } finally {
      setPayAllBizSaving(false)
    }
  }

  // --- Payout handlers ---
  const handleProcessPayout = async (payoutId: string, status: 'COMPLETED' | 'REJECTED') => {
    setPayoutProcessing(payoutId)
    try {
      const res = await apiPut<{ success: boolean }>(`/api/admin/payouts/${payoutId}`, {
        status,
        paymentMethod: payoutMethod,
        adminNote: payoutNote,
      })
      if (res.ok && res.data?.success) {
        setAdminPayouts(prev => prev.map(p => p.id === payoutId ? { ...p, status, paymentMethod: status === 'COMPLETED' ? payoutMethod : null, completedAt: new Date().toISOString() } : p))
        setExpandedPayoutId(null)
        setPayoutNote('')
        setPayoutMethod('TRANSFER')
        toast({ title: status === 'COMPLETED' ? t('admin.payoutCompleted', 'Payout completed') : t('admin.payoutRejected', 'Payout rejected') })
      }
    } catch { /* ignore */ } finally {
      setPayoutProcessing(null)
    }
  }

  const handleApproveEarnings = async (earningIds: string[], label: string) => {
    setApprovingEarnings(true)
    try {
      const res = await apiPost<{ success: boolean; data: { approved: number } }>('/api/admin/earnings/approve-bulk', { earningIds })
      if (res.ok && res.data?.success) {
        // Reload pending earnings from API to ensure sync
        const refreshed = await apiGet<{ success: boolean; data: typeof pendingEarnings }>('/api/admin/earnings?status=PENDING')
        if (refreshed.ok && refreshed.data?.data) {
          setPendingEarnings(refreshed.data.data)
        } else {
          setPendingEarnings(prev => prev.filter(e => !earningIds.includes(e.id)))
        }
        toast({ title: t('admin.earningsApproved', 'Earnings approved'), description: `${res.data.data.approved} ${label}` })
      }
    } catch { /* ignore */ } finally {
      setApprovingEarnings(false)
    }
  }

  // Group pending earnings by user
  const pendingByUser = pendingEarnings.reduce((acc, e) => {
    if (!acc[e.userId]) acc[e.userId] = { userName: e.userName, earnings: [], total: 0 }
    acc[e.userId].earnings.push(e)
    acc[e.userId].total += e.amount
    return acc
  }, {} as Record<string, { userName: string; earnings: typeof pendingEarnings; total: number }>)

  // Filter payouts
  const filteredPayouts = adminPayouts.filter(p => {
    if (payoutStatusFilter !== 'all' && p.status !== payoutStatusFilter) return false
    if (payoutSearch) {
      const s = payoutSearch.toLowerCase()
      return p.userName?.toLowerCase().includes(s) || p.userEmail?.toLowerCase().includes(s)
    }
    return true
  })
  const payoutTotalPages = Math.max(1, Math.ceil(filteredPayouts.length / ITEMS_PER_PAGE))
  const paginatedPayouts = filteredPayouts.slice((payoutPage - 1) * ITEMS_PER_PAGE, payoutPage * ITEMS_PER_PAGE)

  // Filter revenue businesses
  const filteredRevenueBiz = stats?.revenueByBusiness?.filter(biz => {
    if (revenueFilter === 'pending') return biz.owed > 0
    if (revenueFilter === 'paid') return biz.owed === 0 && biz.paid > 0
    return true
  }) || []

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
      {(isFullAdmin || hasPermission('revenue')) && stats && (
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
          <Card className="bg-theme-primary border-theme-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-[var(--theme-primaryForeground,#111827)]">{t('admin.totalRevenue')}</CardTitle>
              <DollarSign className="h-4 w-4 text-[var(--theme-primaryForeground,#111827)] opacity-60" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[var(--theme-primaryForeground,#111827)]">{formatCurrency(stats.totalRevenue)}</div>
              <div className="mt-2 space-y-1">
                {stats.totalOwed > 0 ? (
                  <>
                    <p className="text-xs text-red-600 font-medium">
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
      {(isFullAdmin || hasPermission('revenue')) && stats?.revenueByBusiness && stats.revenueByBusiness.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              {t('admin.revenueBreakdown', 'Revenue by Business')}
            </CardTitle>
            <div className="flex items-center justify-between">
              <CardDescription>
                {t('admin.revenueBreakdownDesc', 'Detailed breakdown of who owes and payment status')}
              </CardDescription>
              <Button size="sm" variant="outline" className="text-xs h-7"
                onClick={() => window.open('/api/admin/export/payments', '_blank')}>
                {t('admin.exportCSV', 'Export CSV')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filter tabs */}
            <div className="flex gap-2">
              {(['all', 'pending', 'paid'] as const).map(f => {
                const count = f === 'all' ? stats.revenueByBusiness!.length
                  : f === 'pending' ? stats.revenueByBusiness!.filter(b => b.owed > 0).length
                  : stats.revenueByBusiness!.filter(b => b.owed === 0 && b.paid > 0).length
                return (
                  <Button key={f} size="sm" variant={revenueFilter === f ? 'default' : 'outline'}
                    onClick={() => { setRevenueFilter(f); setSelectedRevenueBiz(null); setRevenueBizCharges([]); setPayingChargeId(null); setExpandedChargePayments(null) }}>
                    {f === 'all' ? t('admin.allBusinesses', 'All Businesses') : f === 'pending' ? t('admin.pending', 'Pending') : t('admin.paid', 'Paid')} ({count})
                  </Button>
                )
              })}
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 snap-x snap-mandatory">
              {filteredRevenueBiz.map((biz) => (
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
                    setPayingChargeId(null)
                    setExpandedChargePayments(null)
                    const cached = chargesCache.get(biz.businessId)
                    if (cached) {
                      setRevenueBizCharges(cached)
                      return
                    }
                    setRevenueBizChargesLoading(true)
                    setRevenueBizCharges([])
                    setPaymentBatches([])
                    try {
                      const [chargesRes, batchesRes] = await Promise.all([
                        apiGet<{ success: boolean; data: { charges: ChargeDetail[] } }>(`/api/admin/charges?businessId=${biz.businessId}`),
                        apiGet<{ success: boolean; data: PaymentBatch[] }>(`/api/admin/payment-batches?businessId=${biz.businessId}`),
                      ])
                      if (chargesRes.ok && chargesRes.data?.data) {
                        setRevenueBizCharges(chargesRes.data.data.charges)
                        setChargesCache(prev => new Map(prev).set(biz.businessId, chargesRes.data!.data.charges))
                      }
                      if (batchesRes.ok && batchesRes.data?.data) {
                        setPaymentBatches(batchesRes.data.data)
                      }
                    } catch { /* ignore */ } finally {
                      setRevenueBizChargesLoading(false)
                    }
                  }}
                >
                  <div className="h-14 w-14 rounded-xl overflow-hidden bg-muted border border-border mb-2">
                    {biz.businessLogo ? (
                      <img src={biz.businessLogo} alt={biz.businessName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                    )}
                  </div>
                  <p className="font-semibold text-sm text-foreground truncate w-full">{biz.businessName}</p>
                  <p className="text-lg font-bold text-foreground mt-1">{formatCurrency(biz.total)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('admin.chargeCount', '{{count}} charges', { count: biz.chargeCount })}
                  </p>
                  <div className="flex flex-col items-center gap-0.5 mt-1.5">
                    {biz.owed > 0 && (
                      <span className="text-xs font-medium text-theme-error">
                        {t('admin.owes', 'Owes')}: {formatCurrency(biz.owed)}
                      </span>
                    )}
                    {biz.paid > 0 && (
                      <span className="text-xs text-theme-success">
                        {t('admin.paid', 'Paid')}: {formatCurrency(biz.paid)}
                      </span>
                    )}
                    {biz.owed === 0 && biz.paid > 0 && (
                      <CheckCircle className="h-3.5 w-3.5 text-theme-success mt-0.5" />
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
                  <div className="flex flex-col xl:grid xl:grid-cols-3 gap-4">
                    {/* 1. Summary bar - always first */}
                    <div className="xl:col-span-2 order-1">
                      {(() => {
                        const dateFiltered = filterByDate(revenueBizCharges, chargesDateRange, (c) => c.createdAt, chargesStartDate, chargesEndDate)
                        const totalPlatform = dateFiltered.reduce((s, c) => s + c.platformAmount, 0)
                        const totalPaidAmt = dateFiltered.reduce((s, c) => s + (c.paidAmount || 0), 0)
                        const pct = totalPlatform > 0 ? Math.round((totalPaidAmt / totalPlatform) * 100) : 0
                        return (
                          <div className="rounded-xl bg-black/15 backdrop-blur-sm p-3">
                            <div className="flex flex-wrap items-center gap-3 text-sm">
                              <span className="font-semibold">{dateFiltered.length} {t('admin.charges', 'charges')}</span>
                              <span className="text-white/30">|</span>
                              <span>{t('admin.totalCharge', 'Total')}: <strong>{formatCurrency(totalPlatform)}</strong></span>
                              <span className="text-theme-success">{t('admin.paid', 'Paid')}: {formatCurrency(totalPaidAmt)}</span>
                              <span className="text-theme-error">{t('admin.owes', 'Owed')}: {formatCurrency(totalPlatform - totalPaidAmt)}</span>
                              <div className="flex items-center gap-2 ml-auto">
                                <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                                  <div className="h-full bg-theme-success rounded-full transition-all" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs font-medium opacity-70">{pct}%</span>
                              </div>
                            </div>
                            {chargesDateRange !== 'all' && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-muted-foreground">
                                  {chargesStartDate && new Date(chargesStartDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  {chargesEndDate && chargesEndDate !== chargesStartDate && ` — ${new Date(chargesEndDate + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                                </span>
                                <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => {
                                  setChargesDateRange('all')
                                  setChargesStartDate('')
                                  setChargesEndDate('')
                                }}>
                                  {t('filters.allTime', 'All Time')} ×
                                </Button>
                              </div>
                            )}
                          </div>
                        )
                      })()}
                    </div>

                    {/* 2. Pay All - second on mobile, right column on desktop */}
                    <div className="order-2 xl:order-3 xl:row-start-1">
                      {(() => {
                        const dateFiltered2 = filterByDate(revenueBizCharges, chargesDateRange, (c) => c.createdAt, chargesStartDate, chargesEndDate)
                        const hasOwed2 = dateFiltered2.some(c => c.status === 'OWED' || c.status === 'PARTIAL')
                        if (!hasOwed2) return null
                        return (
                          <div className="rounded-xl border border-white/10 bg-black/15 backdrop-blur-sm p-4 space-y-3">
                            <p className="text-sm font-semibold">{t('admin.payAll', 'Pay All')}</p>
                            <div className="grid grid-cols-2 xl:grid-cols-1 gap-2">
                              <Select value={payAllMethod} onValueChange={(v) => setPayAllMethod(v as PaymentMethod)}>
                                <SelectTrigger className="h-9 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="CASH">{t('admin.methodCash', 'Cash')}</SelectItem>
                                  <SelectItem value="TRANSFER">{t('admin.methodTransfer', 'Transfer')}</SelectItem>
                                  <SelectItem value="ZELLE">{t('admin.methodZelle', 'Zelle')}</SelectItem>
                                  <SelectItem value="CHECK">{t('admin.methodCheck', 'Check')}</SelectItem>
                                  <SelectItem value="OTHER">{t('admin.methodOther', 'Other')}</SelectItem>
                                </SelectContent>
                              </Select>
                              <Input
                                value={payAllNote}
                                onChange={(e) => setPayAllNote(e.target.value)}
                                placeholder={t('admin.payAllNote', 'Note (optional)...')}
                                className="h-9 text-xs"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="cursor-pointer flex-1">
                                <input type="file" accept="image/*,.pdf" className="hidden"
                                  onChange={(e) => setPayAllFile(e.target.files?.[0] || null)} />
                                <div className={`flex items-center justify-center gap-1 h-9 px-3 text-xs rounded-md border transition-colors w-full ${payAllFile ? 'bg-theme-primary/10 border-theme-primary text-foreground' : 'bg-background border-input text-muted-foreground hover:bg-accent'}`}>
                                  <Paperclip className="h-3 w-3" />
                                  <span>{payAllFile ? payAllFile.name.slice(0, 20) + (payAllFile.name.length > 20 ? '...' : '') : t('admin.attachReceipt', 'Receipt')}</span>
                                </div>
                              </label>
                              {payAllFile && (
                                <button onClick={() => setPayAllFile(null)} className="text-muted-foreground hover:text-foreground">
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                            <Button className="w-full" disabled={payAllBizSaving} onClick={() => {
                              if (confirm(t('admin.payAllConfirm', 'Are you sure you want to mark all charges as paid?'))) {
                                handlePayAllBiz(selectedRevenueBiz!)
                              }
                            }}>
                              {payAllBizSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <DollarSign className="h-4 w-4 mr-2" />}
                              {t('admin.payAll', 'Pay All')}
                            </Button>
                          </div>
                        )
                      })()}
                    </div>

                    {/* 3. Calendar - third on mobile, right column on desktop */}
                    <div className="order-3 xl:order-4 xl:row-start-2">
                      <BusinessCalendar chargeDetails={revenueBizCharges} onDateFilter={(range) => {
                        if (range) {
                          setChargesDateRange('custom')
                          setChargesStartDate(range.from.toISOString().slice(0, 10))
                          setChargesEndDate(range.to.toISOString().slice(0, 10))
                        } else {
                          setChargesDateRange('all')
                          setChargesStartDate('')
                          setChargesEndDate('')
                        }
                      }} />
                    </div>

                    {/* 4. Charges list - last on mobile, left column on desktop */}
                    <div className="xl:col-span-2 order-4 xl:order-2 space-y-3">
                      {/* Payment Batches - collapsible */}
                      {paymentBatches.length > 0 && (
                        <details className="rounded-xl border border-white/10 bg-black/10">
                          <summary className="px-3 py-2 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none">
                            {t('admin.paymentBatches', 'Payment Records')} ({paymentBatches.length})
                          </summary>
                          <div className="px-3 pb-3 space-y-1.5">
                            {paymentBatches.map((batch) => (
                              <div key={batch.id} className="flex flex-wrap items-center gap-2 text-xs py-1.5 border-t border-white/10 first:border-0">
                                <span className="text-muted-foreground">{formatDate(new Date(batch.createdAt))}</span>
                                <span className="font-medium">{formatCurrency(batch.totalAmount)}</span>
                                <Badge variant="outline" className="text-[10px] py-0">{{ CASH: t('admin.methodCash'), TRANSFER: t('admin.methodTransfer'), ZELLE: t('admin.methodZelle'), CHECK: t('admin.methodCheck'), OTHER: t('admin.methodOther') }[batch.method] || batch.method}</Badge>
                                {batch.note && <span className="text-muted-foreground truncate max-w-[150px]">{batch.note}</span>}
                                {batch.receiptUrl && (
                                  <a href={batch.receiptUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-theme-primary hover:underline ml-auto">
                                    <FileText className="h-3 w-3" />
                                    <span>{t('admin.receipt', 'Receipt')}</span>
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </details>
                      )}

                      {/* Charge rows - scrollable */}
                      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                      {filterByDate(revenueBizCharges, chargesDateRange, (c) => c.createdAt, chargesStartDate, chargesEndDate).map((charge) => {
                        const remaining = charge.platformAmount - (charge.paidAmount || 0)
                        const paidPct = charge.platformAmount > 0 ? Math.round(((charge.paidAmount || 0) / charge.platformAmount) * 100) : 0
                        return (
                          <div key={charge.id} className="rounded-lg border border-white/10 bg-black/15">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2">
                              <div className="flex-1 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`h-2 w-2 rounded-full ${charge.status === 'PAID' ? 'bg-theme-success' : charge.status === 'PARTIAL' ? 'bg-theme-warning' : 'bg-theme-error'}`} />
                                  <span className="font-medium text-sm">
                                    {t('admin.chargeId', 'Charge')} #{charge.id.slice(0, 7).toUpperCase()}
                                  </span>
                                  <Badge variant={charge.status === 'PAID' ? 'default' : charge.status === 'OWED' ? 'destructive' : 'secondary'}>
                                    {charge.status === 'PAID' ? t('admin.paid') : charge.status === 'OWED' ? t('admin.owes') : charge.status === 'PARTIAL' ? t('admin.partialPay') : charge.status}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(new Date(charge.createdAt))}
                                  {charge.paidAt && ` — ${t('admin.paidOn', 'Paid')} ${formatDate(new Date(charge.paidAt))}`}
                                </p>
                                {charge.visit && (
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                    <span className="flex items-center gap-1">
                                      <UserIcon className="h-3 w-3" />
                                      {t('admin.visitAttribution', 'Via')}: {charge.visit.attributionType === 'REFERRER' ? t('admin.promoter') : t('admin.platform')}
                                    </span>
                                    {charge.visit.isNewCustomer && (
                                      <Badge variant="outline" className="text-[10px] py-0">{t('admin.newCustomer', 'New Customer')}</Badge>
                                    )}
                                    {charge.visit.referrerUserId && (() => {
                                      const referrer = users.find(u => u.id === charge.visit!.referrerUserId)
                                      return referrer ? <span className="text-theme-primary">{t('admin.promoter')}: {referrer.name || referrer.email}</span> : null
                                    })()}
                                    {charge.visit.consumerUserId && (() => {
                                      const consumer = users.find(u => u.id === charge.visit!.consumerUserId)
                                      return consumer ? <span>{t('admin.consumer', 'Consumer')}: {consumer.name || consumer.email}</span> : null
                                    })()}
                                  </div>
                                )}
                                {/* Progress bar for partial */}
                                {charge.status === 'PARTIAL' && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div className="h-full bg-theme-warning rounded-full" style={{ width: `${paidPct}%` }} />
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">{paidPct}%</span>
                                  </div>
                                )}
                                <div className="text-[11px] text-muted-foreground space-x-2">
                                  <span>{t('admin.totalCharge', 'Total')}: {formatCurrency(charge.amount)}</span>
                                  {charge.referrerAmount > 0 && <span>{t('admin.referrerPortion', 'Promoter')}: {formatCurrency(charge.referrerAmount)}</span>}
                                  {charge.consumerRewardAmount > 0 && <span>{t('admin.consumerReward', 'Reward')}: {formatCurrency(charge.consumerRewardAmount)}</span>}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`text-base font-bold ${charge.status === 'PAID' ? 'text-theme-success' : charge.status === 'PARTIAL' ? 'text-theme-warning' : 'text-theme-error'}`}>
                                  {formatCurrency(charge.platformAmount)}
                                </span>
                                {charge.status === 'PAID' ? (
                                  <span className="text-xs text-theme-success">{t('admin.paid', 'Paid')}</span>
                                ) : (
                                  <span className="text-xs text-theme-error">{t('admin.remaining', 'Remaining')}: {formatCurrency(remaining)}</span>
                                )}
                                <div className="flex gap-1 mt-1">
                                  {charge.status !== 'PAID' && (
                                    <>
                                      <Button size="sm" variant="default" className="text-xs h-7 px-2"
                                        onClick={() => {
                                          setPayingChargeId(charge.id)
                                          setPaymentAmount(remaining.toFixed(2))
                                          setPaymentMethod('TRANSFER')
                                          setPaymentNote('')
                                        }}>
                                        {t('admin.markPaid', 'Mark Paid')}
                                      </Button>
                                      <Button size="sm" variant="outline" className="text-xs h-7 px-2"
                                        onClick={() => {
                                          setPayingChargeId(charge.id)
                                          setPaymentAmount('')
                                          setPaymentMethod('TRANSFER')
                                          setPaymentNote('')
                                        }}>
                                        {t('admin.partialPay', 'Partial')}
                                      </Button>
                                    </>
                                  )}
                                  <Button size="sm" variant="ghost" className="text-xs h-7 px-2"
                                    onClick={() => loadChargePayments(charge.id)}>
                                    {expandedChargePayments === charge.id ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                                    {t('admin.paymentHistory', 'History')}
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Inline payment form */}
                            {payingChargeId === charge.id && (
                              <div className="border-t px-3 py-3 bg-muted/30 space-y-3">
                                <p className="text-sm font-medium">{t('admin.registerPayment', 'Register Payment')}</p>
                                <div className="flex flex-wrap gap-3 items-end">
                                  <div className="space-y-1">
                                    <Label className="text-xs">{t('admin.paymentAmount', 'Amount')}</Label>
                                    <Input type="number" step="0.01" min="0.01" max={remaining}
                                      value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                                      className="w-32 h-8 text-sm" placeholder="0.00" />
                                    <div className="flex gap-1">
                                      {[25, 50, 75, 100].map(pct => (
                                        <button key={pct} type="button" className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground"
                                          onClick={() => setPaymentAmount((remaining * pct / 100).toFixed(2))}>
                                          {pct}%
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">{t('admin.paymentMethod', 'Method')}</Label>
                                    <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                                      <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="CASH">{t('admin.methodCash', 'Cash')}</SelectItem>
                                        <SelectItem value="TRANSFER">{t('admin.methodTransfer', 'Transfer')}</SelectItem>
                                        <SelectItem value="ZELLE">{t('admin.methodZelle', 'Zelle')}</SelectItem>
                                        <SelectItem value="CHECK">{t('admin.methodCheck', 'Check')}</SelectItem>
                                        <SelectItem value="OTHER">{t('admin.methodOther', 'Other')}</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1 flex-1 min-w-[120px]">
                                    <Label className="text-xs">{t('admin.note', 'Note')}</Label>
                                    <Input value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)}
                                      className="h-8 text-sm" placeholder={t('admin.paymentNotePlaceholder', 'Optional note...')} />
                                  </div>
                                  <div className="flex gap-1 items-center">
                                    <Button size="sm" variant="outline" className="h-8 px-2" asChild>
                                      <label className="cursor-pointer">
                                        <Paperclip className="h-3 w-3" />
                                        <span className="hidden sm:inline ml-1 text-xs">{paymentFile ? paymentFile.name.slice(0, 12) + (paymentFile.name.length > 12 ? '...' : '') : t('admin.receipt', 'Receipt')}</span>
                                        <input type="file" className="hidden" accept="image/*,.pdf"
                                          onChange={(e) => setPaymentFile(e.target.files?.[0] || null)} />
                                      </label>
                                    </Button>
                                    <Button size="sm" className="h-8" disabled={paymentSaving} onClick={() => handleRegisterPayment(charge)}>
                                      {paymentSaving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                                      {t('common.save', 'Save')}
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8" onClick={() => { setPayingChargeId(null); setPaymentFile(null) }}>
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Payment history */}
                            {expandedChargePayments === charge.id && (
                              <div className="border-t px-3 py-3 bg-muted/20">
                                {chargePaymentsLoading ? (
                                  <div className="text-center py-3"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
                                ) : chargePayments.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-2">{t('admin.noPayments', 'No payments recorded')}</p>
                                ) : (
                                  <div className="space-y-1">
                                    {chargePayments.map(p => (
                                      <div key={p.id} className={`flex items-center justify-between text-xs p-2 rounded ${p.status === 'VOIDED' ? 'opacity-50 line-through' : ''}`}>
                                        <div className="flex items-center gap-3">
                                          <span>{formatDate(new Date(p.createdAt))}</span>
                                          <span className="font-medium">{formatCurrency(p.amount)}</span>
                                          <Badge variant="outline" className="text-[10px] py-0">{p.method}</Badge>
                                          {p.note && <span className="text-muted-foreground">{p.note}</span>}
                                          {p.receiptUrl && (
                                            <a href={p.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-theme-primary hover:underline flex items-center gap-0.5">
                                              <FileText className="h-3 w-3" />
                                              <span>{t('admin.receipt', 'Receipt')}</span>
                                            </a>
                                          )}
                                        </div>
                                        {p.status !== 'VOIDED' ? (
                                          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-theme-error hover:text-theme-error"
                                            disabled={voidingPayment === p.id}
                                            onClick={() => handleVoidPayment(charge.id, p.id)}>
                                            {voidingPayment === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : t('admin.void', 'Void')}
                                          </Button>
                                        ) : (
                                          <span className="text-[10px] text-muted-foreground">{t('admin.voided', 'Voided')}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                      </div>
                    </div>

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
            {hasPermission('businesses') && <TabsTrigger value="businesses">{t('admin.tabBusinesses')}</TabsTrigger>}
            {hasPermission('referrers') && <TabsTrigger value="referrers">{t('admin.tabPromoters')}</TabsTrigger>}
            {hasPermission('users') && <TabsTrigger value="users">{t('admin.tabUsers')}</TabsTrigger>}
            {hasPermission('visits') && <TabsTrigger value="visits">{t('admin.tabRecentVisits')}</TabsTrigger>}
            {hasPermission('support') && (
            <TabsTrigger value="support">
              {t('admin.tabSupport')}
              {supportTickets.filter((t) => t.status === 'open').length > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-5 min-w-5 px-1 text-[10px]">
                  {supportTickets.filter((t) => t.status === 'open').length}
                </Badge>
              )}
            </TabsTrigger>
            )}
            {hasPermission('payouts') && (
            <TabsTrigger value="payouts">
              {t('admin.tabPayouts', 'Payouts')}
              {(adminPayouts.filter(p => p.status === 'REQUESTED').length + pendingEarnings.length) > 0 && (
                <Badge variant="destructive" className="ml-1.5 h-5 min-w-5 px-1 text-[10px]">
                  {adminPayouts.filter(p => p.status === 'REQUESTED').length + pendingEarnings.length}
                </Badge>
              )}
            </TabsTrigger>
            )}
            {hasPermission('settings') && (
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-1" />
              {t('admin.tabSettings')}
            </TabsTrigger>
            )}
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
                              {business.status === 'active' ? t('common.active', 'Active') : business.status === 'pending' ? t('common.pending', 'Pending') : t('common.suspended', 'Suspended')}
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
                      {/* Admin permissions config - only shown for admin users by full admins */}
                      {u.roles.includes('admin') && u.id !== user?.id && isFullAdmin && (() => {
                        const userPerms = (u.adminPermissions || []) as AdminPermission[]
                        const isLimited = userPerms.length > 0
                        return (
                          <div className="mt-3 ml-14 rounded-lg border border-dashed p-3">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">{t('admin.adminAccess')}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {isLimited ? t('admin.limitedAccess') : t('admin.permFullAccess')}
                                </span>
                                <Switch
                                  checked={!isLimited}
                                  disabled={roleLoading?.startsWith(`${u.id}-perm`)}
                                  onCheckedChange={async (fullAccess) => {
                                    setRoleLoading(`${u.id}-perm-toggle`)
                                    try {
                                      const newPerms = fullAccess ? [] : ['businesses', 'referrers', 'users', 'visits', 'support', 'payouts', 'revenue']
                                      const result = await apiPut<{ success: boolean }>(`/api/admin/users/${u.id}/roles`, { adminPermissions: newPerms })
                                      if (!result.ok) throw new Error('Failed')
                                      setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, adminPermissions: newPerms as AdminPermission[] } : x))
                                      toast({ title: t('common.success'), description: t('admin.permissionsUpdated') })
                                    } catch { toast({ title: t('common.error'), description: 'Failed', variant: 'destructive' }) }
                                    finally { setRoleLoading(null) }
                                  }}
                                />
                              </div>
                            </div>
                            {isLimited && (
                              <div className="flex items-center gap-2 flex-wrap mt-2 pt-2 border-t border-dashed">
                                {(['businesses', 'referrers', 'users', 'visits', 'support', 'payouts', 'revenue'] as AdminPermission[]).map((perm) => {
                                  const hasPerm = userPerms.includes(perm)
                                  const isLoading = roleLoading === `${u.id}-perm-${perm}`
                                  return (
                                    <Badge
                                      key={perm}
                                      variant={hasPerm ? 'secondary' : 'outline'}
                                      className={`cursor-pointer select-none transition-colors text-xs ${
                                        hasPerm ? '' : 'opacity-40 hover:opacity-70'
                                      }`}
                                      onClick={() => {
                                        if (isLoading) return
                                        handleToggleAdminPermission(u.id, perm, userPerms)
                                      }}
                                    >
                                      {isLoading ? (
                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      ) : hasPerm ? (
                                        <X className="h-3 w-3 mr-1" />
                                      ) : (
                                        <Plus className="h-3 w-3 mr-1" />
                                      )}
                                      {t('admin.perm_' + perm)}
                                    </Badge>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })()}
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
                  { value: 'CREATED', label: t('admin.visitCreated', 'Created') },
                  { value: 'CHECKED_IN', label: t('admin.visitCheckedIn', 'Checked In') },
                  { value: 'CONVERTED', label: t('admin.visitConverted', 'Converted') },
                  { value: 'REJECTED', label: t('admin.visitRejected', 'Rejected') },
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
                              {visit.status === 'CREATED' ? t('admin.visitCreated') : visit.status === 'CHECKED_IN' ? t('admin.visitCheckedIn') : visit.status === 'CONVERTED' ? t('admin.visitConverted') : t('admin.visitRejected')}
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
                                {receipt.status === 'VERIFIED' ? t('common.verified', 'Verified') : receipt.status === 'EXTRACTED' ? t('common.extracted', 'Extracted') : receipt.status === 'PROCESSING' ? t('admin.processing') : t('common.failed')}
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
                                {ticket.status === 'resolved' ? t('common.resolved', 'Resolved') : t('common.open', 'Open')}
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

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="mt-4 space-y-4">
          {/* Flow explanation */}
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
            {t('admin.payoutsFlowExplanation', 'Flow: Business pays → earnings appear here for approval → user requests cashout → you process the payout.')}
          </div>

          {/* Pending Earnings Approval */}
          {pendingEarnings.length > 0 && (
            <Card className="border-theme-warning/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-theme-warning" />
                  {t('admin.pendingEarnings', 'Pending Earnings')}
                  <Badge variant="secondary">{pendingEarnings.length}</Badge>
                </CardTitle>
                <CardDescription>{t('admin.pendingEarningsDesc', 'Approve earnings after confirming the business has paid')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Approve All button */}
                <div className="flex justify-end mb-2">
                  <Button size="sm" disabled={approvingEarnings}
                    onClick={() => handleApproveEarnings(pendingEarnings.map(e => e.id), t('admin.allEarnings', 'all earnings'))}>
                    {approvingEarnings && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    {t('admin.approveAll', 'Approve All')} ({pendingEarnings.length})
                  </Button>
                </div>

                {/* Grouped by user (paginated) */}
                {Object.entries(pendingByUser).slice((pendingEarningsPage - 1) * ITEMS_PER_PAGE, pendingEarningsPage * ITEMS_PER_PAGE).map(([userId, { userName, earnings, total }]) => (
                  <div key={userId} className="rounded-lg border border-border bg-background p-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{userName}</span>
                          <Badge variant="outline" className="text-[10px] py-0">
                            {earnings.length} {t('admin.earnings', 'earnings')}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {earnings.map(e => (
                            <span key={e.id} className="flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-theme-warning" />
                              {formatCurrency(e.amount)} — {e.businessName}
                              <Badge variant="outline" className="text-[9px] py-0 ml-0.5">
                                {e.type === 'REFERRER_COMMISSION' ? 'Promoter' : 'Reward'}
                              </Badge>
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-foreground">{formatCurrency(total)}</span>
                        <Button size="sm" className="text-xs h-7" disabled={approvingEarnings}
                          onClick={() => handleApproveEarnings(earnings.map(e => e.id), userName)}>
                          {t('admin.approve', 'Approve')}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                <Pagination page={pendingEarningsPage} totalPages={Math.max(1, Math.ceil(Object.keys(pendingByUser).length / ITEMS_PER_PAGE))} onPageChange={setPendingEarningsPage} />
              </CardContent>
            </Card>
          )}

          {/* Payout Requests */}
          <Card>
            <CardHeader>
              <CardTitle>{t('admin.userPayouts', 'User Payouts')}</CardTitle>
              <CardDescription>{t('admin.managePayouts', 'Review and process user cashout requests')}</CardDescription>
            </CardHeader>
            <CardContent>
              <SearchAndFilter
                search={payoutSearch} onSearchChange={(v) => { setPayoutSearch(v); setPayoutPage(1) }}
                statusFilter={payoutStatusFilter} onStatusChange={(v) => { setPayoutStatusFilter(v); setPayoutPage(1) }}
                searchPlaceholder={t('admin.searchPayoutsPlaceholder', 'Search by name or email...')}
                statuses={[
                  { value: 'REQUESTED', label: t('admin.requested', 'Requested') },
                  { value: 'PROCESSING', label: t('admin.processing', 'Processing') },
                  { value: 'COMPLETED', label: t('admin.completed', 'Completed') },
                  { value: 'REJECTED', label: t('admin.rejected', 'Rejected') },
                ]}
              />

              {filteredPayouts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">{t('admin.noPayoutRequests', 'No payout requests')}</p>
              ) : (
                <div className="space-y-2 mt-4">
                  {paginatedPayouts.map(payout => (
                    <div key={payout.id} className="rounded-lg border border-border bg-background">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{payout.userName}</span>
                            <span className="text-xs text-muted-foreground">{payout.userEmail}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{formatDate(new Date(payout.createdAt))}</span>
                            {payout.hasBankInfo ? (
                              <Badge variant="outline" className="text-[10px] py-0 text-theme-success border-theme-success/30">
                                <Check className="h-2.5 w-2.5 mr-0.5" />
                                {payout.bankName} ••{payout.bankLast4}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] py-0 text-theme-error border-theme-error/30">
                                {t('admin.noBankConfigured', 'No bank info')}
                              </Badge>
                            )}
                            <span>{payout.earningIds.length} {t('admin.earnings', 'earnings')}</span>
                          </div>
                          {payout.completedAt && (
                            <p className="text-xs text-muted-foreground">
                              {payout.status === 'COMPLETED' ? t('admin.paidOn', 'Paid') : t('admin.rejected', 'Rejected')}: {formatDate(new Date(payout.completedAt))}
                              {payout.paymentMethod && ` — ${{ CASH: t('admin.methodCash'), TRANSFER: t('admin.methodTransfer'), ZELLE: t('admin.methodZelle'), CHECK: t('admin.methodCheck'), OTHER: t('admin.methodOther') }[payout.paymentMethod] || payout.paymentMethod}`}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-lg font-bold text-foreground">{formatCurrency(payout.amount)}</span>
                          <Badge variant={
                            payout.status === 'COMPLETED' ? 'default' :
                            payout.status === 'REJECTED' ? 'destructive' :
                            'secondary'
                          }>
                            {payout.status === 'COMPLETED' ? t('admin.completed') : payout.status === 'REJECTED' ? t('admin.rejected') : payout.status === 'REQUESTED' ? t('admin.requested') : payout.status === 'PROCESSING' ? t('admin.processing') : payout.status}
                          </Badge>
                          {(payout.status === 'REQUESTED' || payout.status === 'PROCESSING') && (
                            <div className="flex gap-1 mt-1">
                              <Button size="sm" variant="default" className="text-xs h-7 px-2"
                                onClick={() => {
                                  setExpandedPayoutId(expandedPayoutId === payout.id ? null : payout.id)
                                  setPayoutMethod('TRANSFER')
                                  setPayoutNote('')
                                }}>
                                {t('admin.markPaid', 'Mark Paid')}
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs h-7 px-2 text-theme-error"
                                disabled={payoutProcessing === payout.id}
                                onClick={() => handleProcessPayout(payout.id, 'REJECTED')}>
                                {payoutProcessing === payout.id ? <Loader2 className="h-3 w-3 animate-spin" /> : t('admin.reject', 'Reject')}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Inline payment form */}
                      {expandedPayoutId === payout.id && (
                        <div className="border-t px-4 py-3 bg-muted/30 space-y-3">
                          <p className="text-sm font-medium">{t('admin.processPayout', 'Process Payout')}</p>
                          <div className="flex flex-wrap gap-3 items-end">
                            <div className="space-y-1">
                              <Label className="text-xs">{t('admin.paymentMethod', 'Method')}</Label>
                              <Select value={payoutMethod} onValueChange={(v) => setPayoutMethod(v as PaymentMethod)}>
                                <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="CASH">{t('admin.methodCash', 'Cash')}</SelectItem>
                                  <SelectItem value="TRANSFER">{t('admin.methodTransfer', 'Transfer')}</SelectItem>
                                  <SelectItem value="ZELLE">{t('admin.methodZelle', 'Zelle')}</SelectItem>
                                  <SelectItem value="CHECK">{t('admin.methodCheck', 'Check')}</SelectItem>
                                  <SelectItem value="OTHER">{t('admin.methodOther', 'Other')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-1 flex-1 min-w-[120px]">
                              <Label className="text-xs">{t('admin.note', 'Note')}</Label>
                              <Input value={payoutNote} onChange={(e) => setPayoutNote(e.target.value)}
                                className="h-8 text-sm" placeholder={t('admin.paymentNotePlaceholder', 'Optional note...')} />
                            </div>
                            <div className="flex gap-1">
                              <Button size="sm" className="h-8" disabled={payoutProcessing === payout.id}
                                onClick={() => handleProcessPayout(payout.id, 'COMPLETED')}>
                                {payoutProcessing === payout.id && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                                {t('admin.confirmPayment', 'Confirm Payment')} — {formatCurrency(payout.amount)}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-8" onClick={() => setExpandedPayoutId(null)}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <Pagination page={payoutPage} totalPages={payoutTotalPages} onPageChange={setPayoutPage} />
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
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">{t('admin.autoApproveBusinessLabel')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('admin.autoApproveBusinessHint')}
                  </p>
                </div>
                <Switch
                  checked={autoApproveBusinesses}
                  onCheckedChange={(checked) => handleToggleAutoApprove('autoApproveBusinesses', checked)}
                  disabled={autoApproveSaving}
                />
              </div>
              {autoApproveBusinesses && (
                <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {t('admin.autoApproveBusinessWarning')}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">{t('admin.autoApproveReferrerLabel')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('admin.autoApproveReferrerHint')}
                  </p>
                </div>
                <Switch
                  checked={autoApproveReferrers}
                  onCheckedChange={(checked) => handleToggleAutoApprove('autoApproveReferrers', checked)}
                  disabled={autoApproveSaving}
                />
              </div>
              {autoApproveReferrers && (
                <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-3">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {t('admin.autoApproveReferrerWarning')}
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
