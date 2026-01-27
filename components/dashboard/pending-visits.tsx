'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getPendingVisits, removeVisitIntent, type VisitIntent } from '@/lib/visit-intents'
import { Clock, MapPin, Trash2, ArrowRight, QrCode } from 'lucide-react'

export function PendingVisits() {
  const [pendingVisits, setPendingVisits] = useState<VisitIntent[]>([])

  useEffect(() => {
    // Load pending visits from localStorage
    const visits = getPendingVisits()
    setPendingVisits(visits)
  }, [])

  const handleRemove = (businessId: string) => {
    removeVisitIntent(businessId)
    setPendingVisits(prev => prev.filter(v => v.businessId !== businessId))
  }

  const getDaysRemaining = (expiresAt: number) => {
    const now = Date.now()
    const diff = expiresAt - now
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    return days
  }

  if (pendingVisits.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Pending Visits
            </CardTitle>
            <CardDescription>
              Businesses you scanned but haven&apos;t visited yet
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-sm">
            {pendingVisits.length} pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingVisits.map((visit) => {
            const daysRemaining = getDaysRemaining(visit.expiresAt)

            return (
              <div
                key={visit.businessId}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <QrCode className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm">{visit.businessName}</h4>
                    <p className="text-xs text-muted-foreground">{visit.businessCategory}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Expires in {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'}
                      </span>
                    </div>
                    {visit.referrerId && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        Referred by friend
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link href={`/r/${visit.businessId}${visit.referrerId ? `?ref=${visit.referrerId}` : ''}`}>
                    <Button size="sm" className="gap-2">
                      Visit Now
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemove(visit.businessId)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-900">
            💡 <strong>Tip:</strong> These businesses are saved in your browser.
            Complete your visit within 7 days to claim your rewards!
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
