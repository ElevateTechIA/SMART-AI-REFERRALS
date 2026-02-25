'use client'

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { apiGet, apiPost } from '@/lib/api-client'
import type { SupportTicket } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { HelpCircle, Send, Loader2, MessageSquare, CheckCircle } from 'lucide-react'

export default function SupportPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

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
        setSubject('')
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
              <Label htmlFor="subject">{t('support.subject')}</Label>
              <Input
                id="subject"
                placeholder={t('support.subjectPlaceholder')}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">{t('support.message')}</Label>
              <textarea
                id="message"
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder={t('support.messagePlaceholder')}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={2000}
                required
              />
            </div>
            <Button type="submit" disabled={sending || !subject.trim() || !message.trim()}>
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
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {ticket.message}
                  </p>
                  {ticket.adminReply ? (
                    <div className="ml-4 pl-3 border-l-2 border-primary/30 bg-muted/50 rounded-r-lg py-2 pr-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle className="h-3 w-3 text-primary" />
                        <span className="text-xs font-semibold text-foreground">
                          {t('support.adminReply')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {ticket.adminReply}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {t('support.awaitingReply')}
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
