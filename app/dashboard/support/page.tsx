'use client'

import { useEffect, useState, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { apiGet, apiPost, apiPut } from '@/lib/api-client'
import type { SupportTicket, TicketReply } from '@/lib/types'

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
import { formatDate, formatDateTime } from '@/lib/utils'
import { SearchAndFilter, Pagination, paginate } from '@/components/list-controls'
import { HelpCircle, Send, Loader2, MessageSquare, CheckCircle, Shield, Store } from 'lucide-react'

type SubjectOption = 'recommend' | 'bug' | 'other'

interface RecommendFormData {
  businessName: string
  city: string
  address: string
  phone: string
  contactName: string
  website: string
  knowsOwner: boolean | null
  notes: string
}

const emptyRecommendForm: RecommendFormData = {
  businessName: '',
  city: '',
  address: '',
  phone: '',
  contactName: '',
  website: '',
  knowsOwner: null,
  notes: '',
}

function SupportContent() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const initialSubject = searchParams.get('subject')
  const [subjectOption, setSubjectOption] = useState<SubjectOption>(
    initialSubject === 'recommend' || initialSubject === 'bug' ? initialSubject : 'other'
  )
  const [customSubject, setCustomSubject] = useState('')
  const [message, setMessage] = useState('')
  const [recommendForm, setRecommendForm] = useState<RecommendFormData>(emptyRecommendForm)

  const subject = subjectOption === 'recommend'
    ? t('support.subjectRecommend')
    : subjectOption === 'bug'
    ? t('support.subjectBug')
    : customSubject
  const [ticketSearch, setTicketSearch] = useState('')
  const [ticketStatusFilter, setTicketStatusFilter] = useState('all')
  const [ticketPage, setTicketPage] = useState(1)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyMessage, setReplyMessage] = useState('')
  const [replySending, setReplySending] = useState(false)

  useEffect(() => {
    const fetchTickets = async () => {
      if (!user) return
      try {
        const result = await apiGet<{ tickets: SupportTicket[] }>('/api/support')
        if (result.ok && result.data) {
          setTickets(
            result.data.tickets.map((t) => ({
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
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchTickets()
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    let finalSubject = subject
    let finalMessage = message

    if (subjectOption === 'recommend') {
      if (!recommendForm.businessName.trim() || !recommendForm.city.trim()) return
      finalSubject = t('support.subjectRecommend')
      finalMessage = [
        `**${t('support.recommend.businessName')}:** ${recommendForm.businessName.trim()}`,
        `**${t('support.recommend.city')}:** ${recommendForm.city.trim()}`,
        recommendForm.address && `**${t('support.recommend.address')}:** ${recommendForm.address.trim()}`,
        recommendForm.phone && `**${t('support.recommend.phone')}:** ${recommendForm.phone.trim()}`,
        recommendForm.contactName && `**${t('support.recommend.contactName')}:** ${recommendForm.contactName.trim()}`,
        recommendForm.website && `**${t('support.recommend.website')}:** ${recommendForm.website.trim()}`,
        `**${t('support.recommend.knowsOwner')}:** ${recommendForm.knowsOwner === true ? t('support.recommend.yes') : recommendForm.knowsOwner === false ? t('support.recommend.no') : '—'}`,
        recommendForm.notes && `**${t('support.recommend.additionalNotes')}:** ${recommendForm.notes.trim()}`,
      ].filter(Boolean).join('\n')
    } else {
      if (!finalSubject.trim() || !finalMessage.trim()) return
    }

    setSending(true)
    try {
      const result = await apiPost<{ success: boolean; ticket: SupportTicket }>(
        '/api/support',
        { subject: finalSubject.trim(), message: finalMessage.trim() }
      )

      if (result.ok && result.data?.ticket) {
        const newTicket = {
          ...result.data.ticket,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        setTickets((prev) => [newTicket, ...prev])
        setSubjectOption('other')
        setCustomSubject('')
        setMessage('')
        setRecommendForm(emptyRecommendForm)
        toast({
          title: subjectOption === 'recommend' ? t('support.recommend.sent') : t('support.messageSent'),
          description: subjectOption === 'recommend' ? t('support.recommend.sentDesc') : t('support.messageSentDesc'),
        })
      } else {
        throw new Error(result.error)
      }
    } catch {
      toast({
        title: t('common.error'),
        description: t('support.failedToSend'),
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const handleReply = async (ticketId: string) => {
    if (!replyMessage.trim()) return
    setReplySending(true)
    try {
      const result = await apiPut<{ success: boolean; reply: TicketReply }>(
        '/api/support',
        { ticketId, message: replyMessage.trim() }
      )
      if (result.ok && result.data?.reply) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  replies: [
                    ...(t.replies || []),
                    { ...result.data!.reply, createdAt: new Date(result.data!.reply.createdAt) },
                  ],
                  updatedAt: new Date(),
                }
              : t
          )
        )
        setReplyMessage('')
        setReplyingTo(null)
        toast({
          title: t('support.replySent'),
          description: t('support.replySentDesc'),
        })
      } else {
        throw new Error(result.error)
      }
    } catch {
      toast({
        title: t('common.error'),
        description: t('support.failedToSend'),
        variant: 'destructive',
      })
    } finally {
      setReplySending(false)
    }
  }

  const ticketSearchLower = ticketSearch.toLowerCase()
  const filteredTickets = tickets.filter((ticket) => {
    if (ticketStatusFilter !== 'all' && ticket.status !== ticketStatusFilter) return false
    if (ticketSearch && !ticket.subject.toLowerCase().includes(ticketSearchLower) && !ticket.message.toLowerCase().includes(ticketSearchLower)) return false
    return true
  })
  const { paged: pagedTickets, totalPages: ticketTotalPages } = paginate(filteredTickets, ticketPage)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <HelpCircle className="h-8 w-8 text-primary" />
          {t('support.title')}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t('support.subtitle')}
        </p>
      </div>

      {/* Send Message Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {subjectOption === 'recommend' ? <Store className="h-5 w-5" /> : <Send className="h-5 w-5" />}
            {subjectOption === 'recommend' ? t('support.recommend.title') : t('support.send')}
          </CardTitle>
          {subjectOption === 'recommend' && (
            <CardDescription>{t('support.recommend.subtitle')}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>{t('support.subject')}</Label>
              <Select value={subjectOption} onValueChange={(v) => setSubjectOption(v as SubjectOption)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('support.optionOther')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recommend">{t('support.optionRecommend')}</SelectItem>
                  <SelectItem value="bug">{t('support.optionBug')}</SelectItem>
                  <SelectItem value="other">{t('support.optionOther')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {subjectOption === 'recommend' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('support.recommend.businessName')} *</Label>
                    <Input
                      placeholder={t('support.recommend.businessNamePlaceholder')}
                      value={recommendForm.businessName}
                      onChange={(e) => setRecommendForm((p) => ({ ...p, businessName: e.target.value }))}
                      maxLength={100}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('support.recommend.city')} *</Label>
                    <Input
                      placeholder={t('support.recommend.cityPlaceholder')}
                      value={recommendForm.city}
                      onChange={(e) => setRecommendForm((p) => ({ ...p, city: e.target.value }))}
                      maxLength={100}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('support.recommend.address')}</Label>
                  <Input
                    placeholder={t('support.recommend.addressPlaceholder')}
                    value={recommendForm.address}
                    onChange={(e) => setRecommendForm((p) => ({ ...p, address: e.target.value }))}
                    maxLength={200}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('support.recommend.phone')}</Label>
                    <Input
                      placeholder={t('support.recommend.phonePlaceholder')}
                      value={recommendForm.phone}
                      onChange={(e) => setRecommendForm((p) => ({ ...p, phone: e.target.value }))}
                      maxLength={20}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('support.recommend.contactName')}</Label>
                    <Input
                      placeholder={t('support.recommend.contactNamePlaceholder')}
                      value={recommendForm.contactName}
                      onChange={(e) => setRecommendForm((p) => ({ ...p, contactName: e.target.value }))}
                      maxLength={100}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('support.recommend.website')}</Label>
                  <Input
                    placeholder={t('support.recommend.websitePlaceholder')}
                    value={recommendForm.website}
                    onChange={(e) => setRecommendForm((p) => ({ ...p, website: e.target.value }))}
                    maxLength={200}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('support.recommend.knowsOwner')}</Label>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant={recommendForm.knowsOwner === true ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRecommendForm((p) => ({ ...p, knowsOwner: true }))}
                    >
                      {t('support.recommend.yes')}
                    </Button>
                    <Button
                      type="button"
                      variant={recommendForm.knowsOwner === false ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setRecommendForm((p) => ({ ...p, knowsOwner: false }))}
                    >
                      {t('support.recommend.no')}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('support.recommend.additionalNotes')}</Label>
                  <textarea
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder={t('support.recommend.additionalNotesPlaceholder')}
                    value={recommendForm.notes}
                    onChange={(e) => setRecommendForm((p) => ({ ...p, notes: e.target.value }))}
                    maxLength={500}
                  />
                </div>
              </>
            ) : (
              <>
                {subjectOption === 'other' && (
                  <div className="space-y-2">
                    <Input
                      placeholder={t('support.subjectPlaceholder')}
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      maxLength={200}
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="message">{t('support.message')}</Label>
                  <textarea
                    id="message"
                    className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder={t('support.messagePlaceholder')}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={2000}
                    required
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={
                sending ||
                (subjectOption === 'recommend'
                  ? !recommendForm.businessName.trim() || !recommendForm.city.trim()
                  : !subject.trim() || !message.trim() || (subjectOption === 'other' && !customSubject.trim()))
              }
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('support.sending')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {subjectOption === 'recommend' ? t('support.recommend.submit') : t('support.send')}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Previous Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t('support.myTickets')}
          </CardTitle>
          <CardDescription>
            {tickets.length > 0
              ? t('support.messageCount', { count: tickets.length })
              : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {t('support.noTickets')}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <SearchAndFilter
                search={ticketSearch}
                onSearchChange={(v) => { setTicketSearch(v); setTicketPage(1) }}
                statusFilter={ticketStatusFilter}
                onStatusChange={(v) => { setTicketStatusFilter(v); setTicketPage(1) }}
                statuses={[
                  { value: 'open', label: t('support.open') },
                  { value: 'resolved', label: t('support.resolved') },
                ]}
                searchPlaceholder={t('support.searchPlaceholder')}
              />
              {pagedTickets.map((ticket) => (
                <div key={ticket.id} className="border rounded-lg p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm">{ticket.subject}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(ticket.createdAt)}
                      </p>
                    </div>
                    <Badge variant={ticket.status === 'resolved' ? 'success' : 'secondary'}>
                      {ticket.status === 'resolved' ? t('support.resolved') : t('support.open')}
                    </Badge>
                  </div>

                  {/* Original message */}
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium" style={{ color: 'var(--theme-textPrimary)' }}>{t('support.you')}</p>
                      <div className="text-sm leading-relaxed mt-0.5 whitespace-pre-line">
                        <SafeBoldText text={ticket.message} boldColor="var(--theme-textPrimary)" textColor="var(--theme-textSecondary)" />
                      </div>
                    </div>
                  </div>

                  {/* Legacy admin reply (backward compat) */}
                  {!ticket.replies?.length && ticket.adminReply && (
                    <div className="flex gap-3 ml-4">
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center">
                        <Shield className="h-3.5 w-3.5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="h-3 w-3 text-primary" />
                          <span className="text-xs font-medium text-foreground">
                            {t('support.adminReply')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
                          {ticket.adminReply}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Conversation thread */}
                  {ticket.replies?.map((reply) => (
                    <div key={reply.id} className={`flex gap-3 ${reply.senderRole === 'admin' ? 'ml-4' : ''}`}>
                      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
                        reply.senderRole === 'admin' ? 'bg-green-500/10' : 'bg-primary/10'
                      }`}>
                        {reply.senderRole === 'admin' ? (
                          <Shield className="h-3.5 w-3.5 text-green-600" />
                        ) : (
                          <span className="text-xs font-bold text-primary">
                            {user?.name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium text-foreground">
                            {reply.senderRole === 'admin' ? t('support.adminReply') : t('support.you')}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDateTime(reply.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
                          {reply.message}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Reply form or status */}
                  {ticket.status === 'open' ? (
                    replyingTo === ticket.id ? (
                      <div className="mt-2 space-y-2 pl-10">
                        <textarea
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                          placeholder={t('support.replyPlaceholder')}
                          value={replyMessage}
                          onChange={(e) => setReplyMessage(e.target.value)}
                          maxLength={2000}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setReplyingTo(null); setReplyMessage('') }}
                          >
                            {t('common.cancel')}
                          </Button>
                          <Button
                            size="sm"
                            disabled={!replyMessage.trim() || replySending}
                            onClick={() => handleReply(ticket.id)}
                          >
                            {replySending ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-1" />
                                {t('support.sending')}
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4 mr-1" />
                                {t('support.reply')}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="pl-10">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReplyingTo(ticket.id)}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          {t('support.reply')}
                        </Button>
                      </div>
                    )
                  ) : (
                    <p className="text-xs text-muted-foreground italic pl-10">
                      {t('support.ticketClosed')}
                    </p>
                  )}
                </div>
              ))}
              <Pagination page={ticketPage} totalPages={ticketTotalPages} onPageChange={setTicketPage} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function SupportPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <SupportContent />
    </Suspense>
  )
}
