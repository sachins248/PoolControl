'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { LifeguardAvatar } from '@/components/shared/lifeguard-avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, Clock, Star, ChevronRight } from 'lucide-react'

interface AuditResultClientProps {
  audit: any
  lifeguard: any
  auditType: any
  facility: any
  deadlineHours: number
  remediationTask: any
  hotSeatQueue: any[]
  coachingPoints: Array<{ title: string; description: string }>
  supervisorId: string
}

function useCountdown(deadline: string | null) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    if (!deadline) return
    const interval = setInterval(() => {
      const ms = new Date(deadline).getTime() - Date.now()
      if (ms <= 0) { setTimeLeft('EXPIRED'); return }
      const h = Math.floor(ms / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [deadline])

  return timeLeft
}

export function AuditResultClient({
  audit, lifeguard, auditType, facility, deadlineHours,
  remediationTask, hotSeatQueue, coachingPoints, supervisorId,
}: AuditResultClientProps) {
  const supabase = createClient()

  const [editablePoints, setEditablePoints] = useState(
    coachingPoints.map((p) => ({ ...p, editing: false }))
  )
  const [assigning, setAssigning] = useState(false)
  const [remTask, setRemTask] = useState(remediationTask)

  const deadline = remTask?.deadline ?? null
  const countdown = useCountdown(deadline)

  const passed = audit.passed
  const score = audit.score
  const criteriaResults = audit.audit_criteria_results ?? []
  const guardName = lifeguard?.name ?? 'Unknown'
  const submittedAt = audit.submitted_at
    ? new Date(audit.submitted_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      })
    : ''

  async function handleAssignRemediation() {
    if (remTask) return // already assigned
    setAssigning(true)

    const deadlineDate = new Date(Date.now() + deadlineHours * 60 * 60 * 1000).toISOString()
    const coachingNotes = editablePoints.map((p) => `${p.title}: ${p.description}`).join('\n\n')

    const { data, error } = await supabase
      .from('remediation_tasks')
      .insert({
        audit_id: audit.id,
        facility_id: audit.facility_id,
        lifeguard_id: audit.lifeguard_id,
        assigned_by_id: supervisorId,
        deadline: deadlineDate,
        coaching_notes: coachingNotes,
      })
      .select('*')
      .single()

    if (error) {
      toast.error('Failed to assign remediation task.')
    } else {
      setRemTask(data)
      // Update audit status
      await supabase.from('audits').update({ status: 'remediated' }).eq('id', audit.id)
      toast.success(`Remediation task assigned — ${guardName} has ${deadlineHours} hours.`)
    }
    setAssigning(false)
  }

  const RESULT_STYLES = {
    pass: { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400', label: '✓ Pass' },
    needs_attention: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400', label: '△ Needs Attn' },
    fail: { badge: 'bg-red-100 text-red-700', dot: 'bg-red-400', label: '✕ Fail' },
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-[#0f1e2e] text-white px-8 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">
              Audit Result — {auditType?.display_name} · {guardName} · {audit.zone}
            </h1>
            <p className="text-white/50 text-sm mt-0.5">
              Completed {submittedAt} · Supervisor: {facility?.name}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {passed ? (
              <span className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded-lg font-semibold text-sm">
                <CheckCircle className="w-4 h-4" /> AUDIT PASSED
              </span>
            ) : (
              <span className="flex items-center gap-2 px-3 py-1.5 bg-red-500 text-white rounded-lg font-semibold text-sm">
                <XCircle className="w-4 h-4" /> AUDIT FAILED
              </span>
            )}
            <div className="text-right">
              <p className="text-xs text-white/40">Score</p>
              <p className={cn(
                'text-2xl font-bold',
                (score ?? 0) >= 4 ? 'text-emerald-400' : (score ?? 0) >= 3 ? 'text-amber-400' : 'text-red-400'
              )}>
                {score?.toFixed(1) ?? '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3-column body */}
      <div className="flex-1 flex min-h-0">

        {/* Left: Criteria Breakdown */}
        <div className="w-72 shrink-0 border-r border-gray-200 overflow-y-auto px-5 py-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Criteria Breakdown
          </p>
          <div className="space-y-2.5">
            {criteriaResults.map((r: any) => {
              const style = RESULT_STYLES[r.result as keyof typeof RESULT_STYLES]
              return (
                <div key={r.id} className="flex items-start gap-2.5">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${style.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-snug">{r.criterion_label}</p>
                    <span className={`inline-block mt-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded ${style.badge}`}>
                      {style.label}
                    </span>
                    {r.comment && (
                      <p className="text-xs text-gray-500 mt-0.5 italic">{r.comment}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Center: Coaching Points */}
        <div className="flex-1 overflow-y-auto px-6 py-5 border-r border-gray-200">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">
            What to Talk to {guardName.split(' ')[0]} About
          </p>

          {editablePoints.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-400" />
              <p className="font-medium text-gray-600">All criteria passed!</p>
              <p className="text-sm mt-1">Great job — no coaching needed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {editablePoints.map((point, i) => (
                <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-2 mb-2">
                    <Star className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <h3 className="text-sm font-semibold text-gray-900">{point.title}</h3>
                  </div>
                  {point.editing ? (
                    <Textarea
                      className="text-sm resize-none bg-white"
                      rows={3}
                      value={point.description}
                      onChange={(e) => {
                        const next = [...editablePoints]
                        next[i] = { ...next[i], description: e.target.value }
                        setEditablePoints(next)
                      }}
                      onBlur={() => {
                        const next = [...editablePoints]
                        next[i] = { ...next[i], editing: false }
                        setEditablePoints(next)
                      }}
                      autoFocus
                    />
                  ) : (
                    <p
                      className="text-sm text-gray-700 leading-relaxed cursor-text hover:bg-amber-100 rounded p-1 -m-1 transition-colors"
                      onClick={() => {
                        const next = [...editablePoints]
                        next[i] = { ...next[i], editing: true }
                        setEditablePoints(next)
                      }}
                    >
                      {point.description}
                    </p>
                  )}
                </div>
              ))}
              <p className="text-xs text-gray-400 text-center">Click any coaching point to edit before sending</p>
            </div>
          )}
        </div>

        {/* Right: Hot Seat */}
        <div className="w-72 shrink-0 overflow-y-auto px-5 py-5">
          {!passed ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <p className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
                  {remTask ? 'Hot Seat — Active' : 'Added to Hot Seat'}
                </p>
              </div>

              {/* Countdown */}
              {remTask ? (
                <div className="bg-[#0f1e2e] rounded-xl p-4 mb-4 text-center">
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-1">
                    Remediation Window Closes In
                  </p>
                  <p className={cn(
                    'text-3xl font-bold font-mono',
                    countdown === 'EXPIRED' ? 'text-red-400' : 'text-red-300'
                  )}>
                    {countdown}
                  </p>
                  <p className="text-xs text-white/30 mt-1">{deadlineHours}-hour deadline</p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-4 mb-4 text-center">
                  <Clock className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">
                    {deadlineHours}-hour remediation window starts on assignment
                  </p>
                </div>
              )}

              {/* Queue */}
              <div className="mb-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Hot Seat Queue</p>
                <div className="space-y-2">
                  {hotSeatQueue.slice(0, 4).map((task, i) => {
                    const guard = task.user_profiles
                    const hoursLeft = task.deadline
                      ? Math.max(0, Math.floor((new Date(task.deadline).getTime() - Date.now()) / 3600000))
                      : null
                    return (
                      <div key={task.id} className="flex items-center gap-2.5 py-1.5">
                        <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                        <LifeguardAvatar
                          name={guard?.name ?? '?'}
                          avatarColor={guard?.avatar_color}
                          size="sm"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">
                            {guard?.name?.split(' ')[0]} — Visual
                          </p>
                        </div>
                        <span className={cn(
                          'text-[10px] font-semibold whitespace-nowrap',
                          task.id === remTask?.id ? 'text-emerald-600' : 'text-gray-400'
                        )}>
                          {task.id === remTask?.id ? 'NEW' : hoursLeft !== null ? `${hoursLeft}h left` : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* CTA */}
              <Button
                className={cn(
                  'w-full font-semibold',
                  remTask
                    ? 'bg-gray-100 text-gray-500 cursor-default hover:bg-gray-100'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-white'
                )}
                onClick={!remTask ? handleAssignRemediation : undefined}
                disabled={!!remTask || assigning}
              >
                {assigning ? 'Assigning...' : remTask ? 'Task Assigned ✓' : 'Assign Remediation Task'}
              </Button>
            </>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-600">Audit passed</p>
              <p className="text-xs mt-1">No remediation needed.</p>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
            <Link
              href={`/roster/${audit.lifeguard_id}`}
              className="flex items-center justify-between text-sm text-gray-600 hover:text-emerald-600 transition-colors"
            >
              View {guardName.split(' ')[0]}&apos;s profile <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/schedule"
              className="flex items-center justify-between text-sm text-gray-600 hover:text-emerald-600 transition-colors"
            >
              Back to schedule <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/audits/new"
              className="flex items-center justify-between text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
            >
              Start another audit <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
