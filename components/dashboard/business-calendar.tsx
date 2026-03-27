'use client'

import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Users, DollarSign, UserPlus, UserCheck } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Visit, Charge } from '@/lib/types'

interface DayData {
  visits: number
  conversions: number
  newCustomers: number
  repeatCustomers: number
  revenue: number
  pending: number
}

interface ChargeWithVisit {
  createdAt: string
  platformAmount: number
  amount?: number
  visit?: {
    status: string
    isNewCustomer: boolean
    createdAt: string
  } | null
}

interface BusinessCalendarProps {
  visits?: Visit[]
  charges?: Charge[]
  /** Admin mode: pass ChargeDetail[] with embedded visit data */
  chargeDetails?: ChargeWithVisit[]
  /** Called when a day is selected/deselected. null means deselected. */
  onDaySelect?: (date: Date | null) => void
}

export function BusinessCalendar({ visits, charges, chargeDetails, onDaySelect }: BusinessCalendarProps) {
  const { t } = useTranslation()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const dayMap = useMemo(() => {
    const map = new Map<string, DayData>()
    const empty = (): DayData => ({ visits: 0, conversions: 0, newCustomers: 0, repeatCustomers: 0, revenue: 0, pending: 0 })

    if (chargeDetails) {
      // Admin mode: extract visit + revenue data from ChargeDetail[]
      for (const cd of chargeDetails) {
        const d = new Date(cd.createdAt)
        if (d.getFullYear() !== year || d.getMonth() !== month) continue
        const key = d.getDate().toString()
        const existing = map.get(key) || empty()
        existing.revenue += cd.platformAmount || cd.amount || 0
        if (cd.visit) {
          existing.visits++
          if (cd.visit.status === 'CONVERTED') {
            existing.conversions++
            if (cd.visit.isNewCustomer) existing.newCustomers++
            else existing.repeatCustomers++
          }
          if (cd.visit.status === 'CREATED' || cd.visit.status === 'CHECKED_IN') {
            existing.pending++
          }
        }
        map.set(key, existing)
      }
    } else {
      // Business dashboard mode: separate visits + charges
      for (const visit of (visits || [])) {
        const d = new Date(visit.createdAt)
        if (d.getFullYear() !== year || d.getMonth() !== month) continue
        const key = d.getDate().toString()
        const existing = map.get(key) || empty()
        existing.visits++
        if (visit.status === 'CONVERTED') {
          existing.conversions++
          if (visit.isNewCustomer) existing.newCustomers++
          else existing.repeatCustomers++
        }
        if (visit.status === 'CREATED' || visit.status === 'CHECKED_IN') {
          existing.pending++
        }
        map.set(key, existing)
      }

      for (const charge of (charges || [])) {
        const d = new Date(charge.createdAt)
        if (d.getFullYear() !== year || d.getMonth() !== month) continue
        const key = d.getDate().toString()
        const existing = map.get(key) || empty()
        existing.revenue += charge.amount
        map.set(key, existing)
      }
    }

    return map
  }, [visits, charges, chargeDetails, year, month])

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const isToday = (day: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === day

  const monthName = new Date(year, month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDay(null)
    onDaySelect?.(null)
  }
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDay(null)
    onDaySelect?.(null)
  }

  const selectedData = selectedDay ? dayMap.get(selectedDay.toString()) : null

  // Month totals
  const monthTotals = useMemo(() => {
    let totalVisits = 0, totalConversions = 0, totalRevenue = 0
    dayMap.forEach(d => {
      totalVisits += d.visits
      totalConversions += d.conversions
      totalRevenue += d.revenue
    })
    return { totalVisits, totalConversions, totalRevenue }
  }, [dayMap])

  const weekDays = [
    t('calendar.sun', 'Sun'), t('calendar.mon', 'Mon'), t('calendar.tue', 'Tue'),
    t('calendar.wed', 'Wed'), t('calendar.thu', 'Thu'), t('calendar.fri', 'Fri'), t('calendar.sat', 'Sat')
  ]

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t('businessDashboard.activityCalendar', 'Monthly Activity')}</CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[140px] text-center capitalize">{monthName}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Month summary */}
        <div className="flex gap-4 text-xs text-muted-foreground mt-1">
          <span>{monthTotals.totalVisits} {t('businessDashboard.visitsLabel', 'visits')}</span>
          <span>{monthTotals.totalConversions} {t('businessDashboard.conversionsLabel', 'conversions')}</span>
          {monthTotals.totalRevenue > 0 && <span>{formatCurrency(monthTotals.totalRevenue)}</span>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {weekDays.map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const data = dayMap.get(day.toString())
            const hasActivity = !!data
            const hasRevenue = data && data.revenue > 0
            const isSelected = selectedDay === day

            return (
              <button
                key={day}
                onClick={() => {
                  const newDay = isSelected ? null : day
                  setSelectedDay(newDay)
                  onDaySelect?.(newDay ? new Date(year, month, newDay) : null)
                }}
                className={`relative flex flex-col items-center justify-center rounded-lg py-1.5 text-xs transition-all
                  ${isSelected ? 'ring-2 ring-theme-primary bg-theme-primaryBg' : ''}
                  ${isToday(day) && !isSelected ? 'font-bold' : ''}
                  ${hasActivity ? 'hover:bg-muted cursor-pointer' : 'text-muted-foreground cursor-default'}
                `}
              >
                <span>{day}</span>
                {hasActivity && (
                  <div className="flex gap-0.5 mt-0.5">
                    {data.conversions > 0 && <span className="h-1.5 w-1.5 rounded-full bg-theme-success" />}
                    {hasRevenue && <span className="h-1.5 w-1.5 rounded-full bg-yellow-400" />}
                    {data.pending > 0 && <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-theme-success" /> {t('businessDashboard.legendConversion', 'Conversion')}</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-400" /> {t('businessDashboard.legendRevenue', 'Revenue')}</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400" /> {t('businessDashboard.legendPending', 'Pending')}</span>
        </div>

        {/* Selected day detail */}
        {selectedDay && selectedData && (
          <div className="rounded-xl border border-theme-cardBorder p-4 space-y-3" style={{ background: 'var(--theme-cardBg)' }}>
            <p className="text-sm font-medium">
              {new Date(year, month, selectedDay).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-lg font-bold">{selectedData.visits}</p>
                  <p className="text-[10px] text-muted-foreground">{t('businessDashboard.visitsLabel', 'Visits')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-theme-success" />
                <div>
                  <p className="text-lg font-bold">{selectedData.newCustomers}</p>
                  <p className="text-[10px] text-muted-foreground">{t('businessDashboard.newLabel', 'New')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-lg font-bold">{selectedData.repeatCustomers}</p>
                  <p className="text-[10px] text-muted-foreground">{t('businessDashboard.repeatLabel', 'Repeat')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-lg font-bold">{formatCurrency(selectedData.revenue)}</p>
                  <p className="text-[10px] text-muted-foreground">{t('businessDashboard.revenueLabel', 'Revenue')}</p>
                </div>
              </div>
            </div>
            {selectedData.pending > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedData.pending} {t('businessDashboard.pendingVisits', 'pending visits')}
              </p>
            )}
          </div>
        )}

        {selectedDay && !selectedData && (
          <p className="text-sm text-muted-foreground text-center py-2">
            {t('businessDashboard.noActivityDay', 'No activity on this day')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
