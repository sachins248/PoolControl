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
  ok:        'bg-emerald-500/[0.08] text-emerald-400 border-emerald-500/[0.18]',
  done:      'bg-blue-500/[0.08] text-blue-400 border-blue-500/[0.18]',
  due_today: 'bg-amber-500/[0.10] text-amber-400 border-amber-500/[0.25] hover:bg-amber-500/[0.15] cursor-pointer',
  overdue:   'bg-red-500/[0.10] text-red-400 border-red-500/[0.25] hover:bg-red-500/[0.15] cursor-pointer',
}

const STATUS_LABEL: Record<string, string> = {
  ok:        'OK',
  done:      'Done',
  due_today: 'DUE TODAY',
  overdue:   'Overdue',
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
        'w-full text-left rounded-lg border px-3 py-2.5 transition-all duration-150',
        STATUS_STYLES[cell.status],
        isActionable && 'ring-1 ring-inset',
        cell.status === 'overdue'   && 'ring-red-500/[0.30]',
        cell.status === 'due_today' && 'ring-amber-500/[0.30]',
      )}
    >
      <div className={cn(
        'text-xs font-semibold leading-none tracking-wide',
        cell.status === 'overdue'   && 'text-red-400',
        cell.status === 'due_today' && 'text-amber-400 font-bold',
        cell.status === 'done'      && 'text-blue-400',
        cell.status === 'ok'        && 'text-emerald-400',
      )}>
        {cell.status === 'done' && cell.completed_time
          ? `Done ${cell.completed_time}`
          : STATUS_LABEL[cell.status]}
      </div>
      {cell.days_ago !== null && cell.status !== 'done' && (
        <div className="text-[10px] mt-0.5 opacity-60">
          {cell.days_ago === 0 ? 'today' : `${cell.days_ago}d ago`}
        </div>
      )}
    </button>
  )
}
