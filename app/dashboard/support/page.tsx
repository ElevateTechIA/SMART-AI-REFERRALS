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
import { formatDate, formatDateTime } from '@/lib/utils'
import { HelpCircle, Send, Loader2, MessageSquare, CheckCircle, Shield } from 'lucide-react'

type SubjectOption = 'recommend' | 'bug' | 'other'

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

  const subject = subjectOption === 'recommend'
    ? t('support.subjectRecommend')
    : subjectOption === 'bug'
    ? t('support.subjectBug')
    : customSubject
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
    if (!subject.trim() || !message.trim()) return

    setSending(true)
    try {
      const result = await apiPost<{ success: boolean; ticket: SupportTicket }>(
        '/api/support',
        { subject: subject.trim(), message: message.trim() }
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
        toast({
          title: t('support.messageSent'),
          description: t('support.messageSentDesc'),
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
            <Send className="h-5 w-5" />
            {t('support.send')}
          </CardTitle>
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
              {subjectOption === 'other' && (
                <Input
                  placeholder={t('support.subjectPlaceholder')}
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  maxLength={200}
                  required
                />
              )}
            </div>
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
            <Button type="submit" disabled={sending || !subject.trim() || !message.trim() || (subjectOption === 'other' && !customSubject.trim())}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('support.sending')}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t('support.send')}
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
              ? `${tickets.length} ${tickets.length === 1 ? 'message' : 'messages'}`
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
              {tickets.map((ticket) => (
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
                      <p className="text-xs font-medium text-foreground">{t('support.you')}</p>
                      <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
                        {ticket.message}
                      </p>
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
