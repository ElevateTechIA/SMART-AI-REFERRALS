'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { apiGet } from '@/lib/api-client'
import { formatDate } from '@/lib/utils'
import { Building2, Users, CheckCircle, Loader2, MessageSquare, Mail } from 'lucide-react'
import QRCode from 'qrcode'
import { ShareAppModal } from '@/components/share-app-modal'
import { useTheme } from '@/lib/theme/theme-provider'
import { themes } from '@/lib/theme/colors'
import { WelcomeBanner } from './shared/welcome-banner'
import { PromoLinkCard } from './shared/promo-link-card'

interface AdminStats {
  totalUsers: number
  totalBusinesses: number
  pendingBusinesses: number
  pendingReferrers: number
  totalVisits: number
  totalConversions: number
  totalRevenue: number
  unresolvedFraudFlags: number
  unreadSupportTickets: number
}

interface SupportTicketSummary {
  id: string
  userName: string
  subject: string
  message: string
  createdAt: string | null
}

export function AdminDashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const { toast } = useToast()
  const { theme } = useTheme()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [unreadTickets, setUnreadTickets] = useState<SupportTicketSummary[]>([])
  const [qrCode, setQrCode] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [showShareModal, setShowShareModal] = useState(false)

  const appUrl = 'https://smart-ai-referrals.vercel.app/'

  useEffect(() => {
    if (user) fetchDashboardData()
  }, [user])

  useEffect(() => {
    generateQRCode()
  }, [theme])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const [statsResult, supportResult] = await Promise.all([
        apiGet<{ success: boolean; data: AdminStats }>('/api/admin/stats'),
        apiGet<{ tickets: SupportTicketSummary[] }>('/api/admin/support'),
      ])
      if (statsResult.ok && statsResult.data) {
        setStats(statsResult.data.data)
      }
      if (supportResult.ok && supportResult.data) {
        const unread = (supportResult.data.tickets || []).filter(
          (t: SupportTicketSummary & { read?: boolean }) => !t.read
        )
        setUnreadTickets(unread)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateQRCode = async () => {
    try {
      const qr = await QRCode.toDataURL(appUrl, {
        width: 200,
        margin: 2,
        color: { dark: themes[theme].colors.primaryDark, light: '#ffffff' },
      })
      setQrCode(qr)
    } catch (error) {
      console.error('Error generating QR code:', error)
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(appUrl)
    toast({ title: t('cards.linkCopied'), description: t('cards.linkCopiedDesc') })
  }

  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Eliv', url: appUrl })
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error)
        }
      }
    }
  }

  const shareApp = () => setShowShareModal(true)

  const totalPending = (stats?.pendingBusinesses || 0) + (stats?.pendingReferrers || 0) + (stats?.unreadSupportTickets || 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      <WelcomeBanner
        userName={user?.name?.split(' ')[0] || ''}
        subtitle={t('dashboard.subtitleAdmin')}
      />

      {/* Desktop Content */}
      <div className="hidden md:block">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_1.2fr] gap-4 min-w-0">
          {/* Column 1: Support Messages */}
          <div className="min-w-0">
            <div className="rounded-2xl p-5 shadow-xl h-full flex flex-col" style={{ background: 'linear-gradient(to bottom right, var(--theme-gradientFrom), var(--theme-gradientTo))' }}>
              <h2 className="text-base font-bold text-white mb-4">{t('dashboard.unreadMessages')}</h2>
              {unreadTickets.length > 0 ? (
                <div className="flex-1 flex flex-col justify-evenly">
                  {unreadTickets.slice(0, 3).map((ticket) => (
                    <div key={ticket.id} className="flex items-start gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <Mail className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{ticket.subject}</p>
                        <p className="text-white/70 text-xs truncate">{ticket.userName}</p>
                        <p className="text-white/50 text-[10px] mt-0.5">{ticket.createdAt ? formatDate(ticket.createdAt) : ''}</p>
                      </div>
                    </div>
                  ))}
                  <Link href="/dashboard/admin?tab=support">
                    <Button className="w-full bg-white/20 hover:bg-white/30 text-white rounded-lg h-10 text-sm font-semibold">
                      {t('dashboard.viewSupport')} ({unreadTickets.length})
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <MessageSquare className="h-10 w-10 text-white/40 mb-3" />
                  <p className="text-white/70 text-sm">{t('dashboard.noNewMessages')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: My Referral Link */}
          <div className="min-w-0">
            <PromoLinkCard
              qrCode={qrCode}
              appUrl={appUrl}
              onCopyLink={copyLink}
              onShare={share}
              onShareApp={shareApp}
            />
          </div>

          {/* Column 3: Pending Approvals */}
          <div className="min-w-0">
            <div className="rounded-2xl p-5 shadow-xl overflow-hidden h-full flex flex-col" style={{ background: 'linear-gradient(to bottom right, var(--theme-gradientFrom), var(--theme-gradientTo))' }}>
              <h2 className="text-base font-bold text-white mb-4">{t('dashboard.pendingApprovals')}</h2>

              {totalPending > 0 ? (
                <div className="flex-1 flex flex-col justify-evenly">
                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{t('dashboard.pendingBusinesses')}</p>
                      <p className="text-white/70 text-xs">{t('admin.pendingApproval', { count: stats?.pendingBusinesses || 0 })}</p>
                    </div>
                    <span className="text-2xl font-bold text-white">{stats?.pendingBusinesses || 0}</span>
                  </div>

                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{t('dashboard.pendingPromoters')}</p>
                      <p className="text-white/70 text-xs">{t('admin.pendingApproval', { count: stats?.pendingReferrers || 0 })}</p>
                    </div>
                    <span className="text-2xl font-bold text-white">{stats?.pendingReferrers || 0}</span>
                  </div>

                  <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-semibold text-sm">{t('dashboard.unreadMessages')}</p>
                      <p className="text-white/70 text-xs">{t('dashboard.unreadMessagesCount', { count: stats?.unreadSupportTickets || 0 })}</p>
                    </div>
                    <span className="text-2xl font-bold text-white">{stats?.unreadSupportTickets || 0}</span>
                  </div>

                  <Link href="/dashboard/admin">
                    <Button className="w-full bg-white/20 hover:bg-white/30 text-white rounded-lg h-10 text-sm font-semibold">
                      {t('dashboard.reviewApprovals')}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <CheckCircle className="h-10 w-10 text-white/40 mb-3" />
                  <p className="text-white/70 text-sm">{t('dashboard.noPendingApprovals')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Content */}
      <div className="md:hidden">
        <div className="space-y-2">
          {/* Support Messages */}
          <div className="rounded-xl p-2.5 shadow-lg" style={{ background: 'linear-gradient(to bottom right, var(--theme-gradientFrom), var(--theme-gradientTo))' }}>
            <h2 className="text-sm font-bold text-white mb-2">{t('dashboard.unreadMessages')}</h2>
            {unreadTickets.length > 0 ? (
              <div className="space-y-1.5">
                {unreadTickets.slice(0, 3).map((ticket) => (
                  <div key={ticket.id} className="flex items-start gap-2 bg-white/10 backdrop-blur-sm rounded-lg p-2">
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-xs truncate">{ticket.subject}</p>
                      <p className="text-white/70 text-[10px] truncate">{ticket.userName}</p>
                    </div>
                  </div>
                ))}
                <Link href="/dashboard/admin?tab=support">
                  <Button className="w-full bg-white/20 hover:bg-white/30 text-white rounded-md h-8 text-[11px] font-semibold">
                    {t('dashboard.viewSupport')} ({unreadTickets.length})
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-4">
                <MessageSquare className="h-8 w-8 text-white/40 mb-2" />
                <p className="text-white/70 text-[10px]">{t('dashboard.noNewMessages')}</p>
              </div>
            )}
          </div>

          {/* My Promo Link */}
          <PromoLinkCard
            qrCode={qrCode}
            appUrl={appUrl}
            onCopyLink={copyLink}
            onShare={share}
            onShareApp={shareApp}
          />

          {/* Pending Approvals */}
          <div className="rounded-xl p-2.5 shadow-lg" style={{ background: 'linear-gradient(to bottom right, var(--theme-gradientFrom), var(--theme-gradientTo))' }}>
            <h2 className="text-sm font-bold text-white mb-2">{t('dashboard.pendingApprovals')}</h2>

            {totalPending > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg p-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-xs">{t('dashboard.pendingBusinesses')}</p>
                    <p className="text-white/70 text-[10px]">{t('admin.pendingApproval', { count: stats?.pendingBusinesses || 0 })}</p>
                  </div>
                  <span className="text-lg font-bold text-white">{stats?.pendingBusinesses || 0}</span>
                </div>

                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg p-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-xs">{t('dashboard.pendingPromoters')}</p>
                    <p className="text-white/70 text-[10px]">{t('admin.pendingApproval', { count: stats?.pendingReferrers || 0 })}</p>
                  </div>
                  <span className="text-lg font-bold text-white">{stats?.pendingReferrers || 0}</span>
                </div>

                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg p-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-semibold text-xs">{t('dashboard.unreadMessages')}</p>
                    <p className="text-white/70 text-[10px]">{t('dashboard.unreadMessagesCount', { count: stats?.unreadSupportTickets || 0 })}</p>
                  </div>
                  <span className="text-lg font-bold text-white">{stats?.unreadSupportTickets || 0}</span>
                </div>

                <Link href="/dashboard/admin">
                  <Button className="w-full bg-white/20 hover:bg-white/30 text-white rounded-md h-8 text-[11px] font-semibold">
                    {t('dashboard.reviewApprovals')}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-4">
                <CheckCircle className="h-8 w-8 text-white/40 mb-2" />
                <p className="text-white/70 text-[10px]">{t('dashboard.noPendingApprovals')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ShareAppModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  )
}
