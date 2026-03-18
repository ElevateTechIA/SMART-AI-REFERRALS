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

export function paginate<T>(items: T[], page: number): { paged: T[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / ITEMS_PER_PAGE))
  const paged = items.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)
  return { paged, totalPages }
}
