'use client'

import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'

export const ITEMS_PER_PAGE = 10

export function Pagination({ page, totalPages, onPageChange }: { page: number; totalPages: number; onPageChange: (p: number) => void }) {
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

export function SearchAndFilter({ search, onSearchChange, statusFilter, onStatusChange, statuses, searchPlaceholder }: {
  search: string; onSearchChange: (v: string) => void
  statusFilter?: string; onStatusChange?: (v: string) => void
  statuses?: { value: string; label: string }[]
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
      {statusFilter !== undefined && onStatusChange && statuses && (
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
      )}
    </div>
  )
}

export type DateRange = 'all' | 'this_month' | 'last_month' | 'this_year' | 'custom'

export function DateFilter({ value, onChange, startDate, endDate, onStartChange, onEndChange }: {
  value: DateRange; onChange: (v: DateRange) => void
  startDate?: string; endDate?: string
  onStartChange?: (v: string) => void; onEndChange?: (v: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={value} onValueChange={(v) => onChange(v as DateRange)}>
        <SelectTrigger className="w-[160px] h-9 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('filters.allTime', 'All Time')}</SelectItem>
          <SelectItem value="this_month">{t('filters.thisMonth', 'This Month')}</SelectItem>
          <SelectItem value="last_month">{t('filters.lastMonth', 'Last Month')}</SelectItem>
          <SelectItem value="this_year">{t('filters.thisYear', 'This Year')}</SelectItem>
          <SelectItem value="custom">{t('filters.custom', 'Custom Range')}</SelectItem>
        </SelectContent>
      </Select>
      {value === 'custom' && onStartChange && onEndChange && (
        <div className="flex items-center gap-1">
          <Input type="date" value={startDate || ''} onChange={(e) => onStartChange(e.target.value)} className="h-9 text-xs w-[130px]" />
          <span className="text-xs text-muted-foreground">—</span>
          <Input type="date" value={endDate || ''} onChange={(e) => onEndChange(e.target.value)} className="h-9 text-xs w-[130px]" />
        </div>
      )}
    </div>
  )
}

export function getDateRange(range: DateRange, startDate?: string, endDate?: string): { from: Date | null; to: Date | null } {
  const now = new Date()
  switch (range) {
    case 'this_month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: null }
    case 'last_month':
      return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59) }
    case 'this_year':
      return { from: new Date(now.getFullYear(), 0, 1), to: null }
    case 'custom':
      return { from: startDate ? new Date(startDate) : null, to: endDate ? new Date(endDate + 'T23:59:59') : null }
    default:
      return { from: null, to: null }
  }
}

export function filterByDate<T>(items: T[], range: DateRange, getDate: (item: T) => string | Date, startDate?: string, endDate?: string): T[] {
  if (range === 'all') return items
  const { from, to } = getDateRange(range, startDate, endDate)
  return items.filter(item => {
    const d = new Date(getDate(item))
    if (from && d < from) return false
    if (to && d > to) return false
    return true
  })
}

export function paginate<T>(items: T[], page: number): { paged: T[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE))
  const paged = items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  return { paged, totalPages }
}
