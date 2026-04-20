'use client'

import { cn } from '@/lib/utils'
import type { ScheduleCell, AuditTypeName } from '@/types'
import { useRouter } from 'next/navigation'

interface ScheduleCellProps {
  cell: ScheduleCell
  lifeguardId: string
  auditType: AuditTypeName
}

const STATUS_STYLES: Record<string, string> = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100',
  done: 'bg-blue-50 text-blue-700 border-blue-100',
  due_today: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 cursor-pointer',
  overdue: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 cursor-pointer',
}

const STATUS_LABEL: Record<string, string> = {
  ok: '✓ OK',
  done: '✓ Done',
  due_today: '▶ DUE TODAY',
  overdue: '✕ Overdue',
}

export function ScheduleCellComponent({ cell, lifeguardId, auditType }: ScheduleCellProps) {
  const router = useRouter()
  const isActionable = cell.status === 'due_today' || cell.status === 'overdue'

  function handleClick() {
    if (isActionable) {
      router.push(`/audits/new?lifeguardId=${lifeguardId}&auditType=${auditType}`)
    } else if (cell.audit_id) {
      router.push(`/audits/result/${cell.audit_id}`)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={cell.status === 'ok' && !cell.audit_id}
      className={cn(
        'w-full text-left rounded-lg border px-3 py-2.5 transition-all',
        STATUS_STYLES[cell.status],
        isActionable && 'ring-1 ring-inset',
        cell.status === 'overdue' && 'ring-red-300',
        cell.status === 'due_today' && 'ring-amber-300',
      )}
    >
      <div className={cn(
        'text-xs font-semibold leading-none',
        cell.status === 'overdue' && 'text-red-600',
        cell.status === 'due_today' && 'text-amber-700 font-bold',
      )}>
        {cell.status === 'done' && cell.completed_time
          ? `✓ Done ${cell.completed_time}`
          : STATUS_LABEL[cell.status]}
      </div>
      {cell.days_ago !== null && cell.status !== 'done' && (
        <div className="text-[10px] mt-0.5 opacity-70">
          {cell.days_ago === 0 ? 'today' : `${cell.days_ago} days ago`}
        </div>
      )}
    </button>
  )
}
