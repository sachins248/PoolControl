'use client'

import '../../new/audit.css'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { LifeguardAvatar } from '@/components/shared/lifeguard-avatar'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { CheckCircle, Clock, ChevronRight } from 'lucide-react'
import { assignRemediationTask } from './actions'

interface AuditResultClientProps {
  audit: any
  lifeguard: any
  auditType: any
  facility: any
  deadlineHours: number
  remediationTask: any
  hotSeatQueue: any[]
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
  remediationTask, hotSeatQueue,
}: AuditResultClientProps) {
  const criteriaResults = audit.audit_criteria_results ?? []
  const hasFailures = criteriaResults.some(
    (r: any) => r.result === 'fail' || r.result === 'needs_attention'
  )

  const [editablePoints, setEditablePoints] = useState<Array<{ title: string; description: string; editing: boolean }>>([])
  const [coachingLoading, setCoachingLoading] = useState(hasFailures)
  const [assigning, setAssigning] = useState(false)
  const [remTask, setRemTask] = useState(remediationTask)

  const deadline = remTask?.deadline ?? null
  const countdown = useCountdown(deadline)

  const passed = audit.passed
  const score = audit.score
  const guardName = lifeguard?.name ?? 'Unknown'
  const submittedAt = audit.submitted_at
    ? new Date(audit.submitted_at).toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      })
    : ''

  // Fetch coaching points client-side so the page renders immediately
  useEffect(() => {
    if (!hasFailures) return

    const failedCriteria = criteriaResults.filter(
      (r: any) => r.result === 'fail' || r.result === 'needs_attention'
    )

    const fallback = failedCriteria.map((r: any) => ({
      title: r.criterion_label,
      description: r.result === 'fail'
        ? 'This criterion was marked as a failure. Review the standard technique and expectations with the lifeguard before their next shift.'
        : 'This criterion needs attention. Discuss proper technique and what "meeting standard" looks like with the lifeguard.',
      editing: false,
    }))

    fetch('/api/coach/coaching-points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        failed_criteria: failedCriteria,
        audit_type: audit.audit_type_name,
        cert_body: auditType?.cert_body,
        lifeguard_name: lifeguard?.name ?? 'the lifeguard',
        criteria_definitions: auditType?.criteria,
      }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setEditablePoints(data.map((p: any) => ({ ...p, editing: false })))
        } else {
          setEditablePoints(fallback)
        }
      })
      .catch(() => setEditablePoints(fallback))
      .finally(() => setCoachingLoading(false))
  }, [])

  async function handleAssignRemediation() {
    if (remTask) return
    setAssigning(true)

    const coachingNotes = editablePoints.map((p) => `${p.title}: ${p.description}`).join('\n\n')

    const { data, error } = await assignRemediationTask(
      audit.id,
      deadlineHours,
      coachingNotes,
    )

    if (error || !data) {
      toast.error(error ?? 'Failed to assign remediation task.')
    } else {
      setRemTask(data)
      toast.success(`Remediation task assigned — ${guardName} has ${deadlineHours} hours.`)
    }
    setAssigning(false)
  }

  const RESULT_META: Record<string, { pill: string; dot: string; label: string }> = {
    pass:            { pill: 'da-pill da-pill-pass', dot: '#45e0ce', label: 'PASS' },
    needs_attention: { pill: 'da-pill da-pill-attn', dot: '#ffb020', label: 'NEEDS ATTN' },
    fail:            { pill: 'da-pill da-pill-fail', dot: '#ff4a1a', label: 'FAIL' },
  }

  const sectionLabel = 'da-label'

  return (
    <div className="da-root" style={{ height: '100%' }}>
      {/* ── Console header ── */}
      <div className="da-head">
        <div className="da-head-bar">
          <span>AUDIT RESULT · {auditType?.display_name?.toUpperCase()}</span>
          <span>{facility?.name?.toUpperCase()}</span>
        </div>
        <div className="da-head-main">
          <div>
            <h1 className="da-title">
              {guardName} <em>{audit.zone ?? ''}</em>
            </h1>
            <p className="da-sub">
              COMPLETED {submittedAt.toUpperCase()}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22, flexShrink: 0 }}>
            <span
              className={passed ? 'da-pill da-pill-pass' : 'da-pill da-pill-fail'}
              style={{ fontSize: 10, padding: '7px 14px', letterSpacing: '0.2em' }}
            >
              {passed ? 'AUDIT PASSED' : 'AUDIT FAILED'}
            </span>
            <div className="da-score">
              <div className={cn('da-score-val', (score ?? 0) < 3 && 'is-low')}>
                {score?.toFixed(1) ?? '—'}
              </div>
              <div className="da-score-label">SCORE / 5.0</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3-column body ── */}
      <div className="da-body">

        {/* Left: Criteria Breakdown */}
        <div style={{ width: 288, flexShrink: 0, borderRight: '1px solid var(--hairline)', overflowY: 'auto', padding: '20px 20px 28px' }}>
          <span className={sectionLabel}>CRITERIA BREAKDOWN</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {criteriaResults.map((r: any) => {
              const meta = RESULT_META[r.result] ?? RESULT_META.pass
              return (
                <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderTop: '1px solid var(--hairline-soft)' }}>
                  <span style={{ width: 7, height: 7, marginTop: 5, flexShrink: 0, background: meta.dot }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: 10.5, lineHeight: 1.6, letterSpacing: '0.04em' }}>
                      {r.criterion_label}
                    </p>
                    <span className={meta.pill} style={{ display: 'inline-block', marginTop: 6 }}>
                      {meta.label}
                    </span>
                    {r.comment && (
                      <p style={{ margin: '6px 0 0', fontSize: 9.5, fontStyle: 'italic', opacity: 0.55, lineHeight: 1.6 }}>
                        {r.comment}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Center: Coaching Points */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px 28px', borderRight: '1px solid var(--hairline)' }}>
          <span className={sectionLabel}>
            WHAT TO TALK TO <b>{guardName.split(' ')[0].toUpperCase()}</b> ABOUT
          </span>

          {!hasFailures ? (
            <div style={{ textAlign: 'center', padding: '56px 0' }}>
              <CheckCircle className="w-9 h-9" style={{ color: '#45e0ce', margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontFamily: 'var(--disp)', fontWeight: 700, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                All criteria passed
              </p>
              <p className="da-sub" style={{ marginTop: 8 }}>NO COACHING NEEDED.</p>
            </div>
          ) : coachingLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="da-coach-msg" style={{ opacity: 0.35 }}>
                  <div style={{ height: 11, width: '55%', background: 'var(--hairline)', marginBottom: 10 }} />
                  <div style={{ height: 8, width: '100%', background: 'var(--hairline-soft)', marginBottom: 6 }} />
                  <div style={{ height: 8, width: '80%', background: 'var(--hairline-soft)' }} />
                </div>
              ))}
              <p className="da-sub" style={{ textAlign: 'center' }}>
                GENERATING COACHING POINTS<span className="da-caret" />
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {editablePoints.map((point, i) => (
                <div key={i} className="da-coach-msg">
                  <p style={{ margin: '0 0 8px', fontFamily: 'var(--disp)', fontWeight: 700, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--aqua)' }}>
                    {String(i + 1).padStart(2, '0')} / {point.title}
                  </p>
                  {point.editing ? (
                    <Textarea
                      className="da-textarea"
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
                      style={{ margin: 0, fontSize: 10.5, lineHeight: 1.75, letterSpacing: '0.03em', cursor: 'text' }}
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
              <p className="da-sub" style={{ textAlign: 'center' }}>
                CLICK ANY COACHING POINT TO EDIT BEFORE SENDING
              </p>
            </div>
          )}
        </div>

        {/* Right: Hot Seat */}
        <div style={{ width: 288, flexShrink: 0, overflowY: 'auto', padding: '20px 20px 28px' }}>
          {!passed ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span
                  className={remTask ? 'da-rec' : undefined}
                  style={{ width: 7, height: 7, background: remTask ? 'var(--signal)' : 'var(--hairline)' }}
                />
                <span className={sectionLabel} style={{ marginBottom: 0 }}>
                  {remTask ? 'HOT SEAT — ACTIVE' : 'PENDING ASSIGNMENT'}
                </span>
              </div>

              {remTask ? (
                <div style={{ border: '1px solid var(--signal)', background: 'rgba(255,74,26,0.06)', padding: '16px 14px', marginBottom: 16, textAlign: 'center' }}>
                  <p className="da-eyebrow" style={{ margin: '0 0 8px' }}>REMEDIATION WINDOW CLOSES IN</p>
                  <p style={{ margin: 0, fontFamily: 'var(--disp)', fontWeight: 900, fontSize: 26, lineHeight: 1, color: 'var(--signal)' }}>
                    {countdown}
                  </p>
                  <p className="da-sub" style={{ marginTop: 8 }}>{deadlineHours}-HOUR DEADLINE</p>
                </div>
              ) : (
                <div className="da-notes" style={{ marginBottom: 16, textAlign: 'center' }}>
                  <Clock className="w-5 h-5" style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <p className="da-sub" style={{ margin: 0 }}>
                    {deadlineHours}-HOUR REMEDIATION WINDOW STARTS ON ASSIGNMENT
                  </p>
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <span className={sectionLabel}>HOT SEAT QUEUE</span>
                <div>
                  {hotSeatQueue.slice(0, 4).map((task, i) => {
                    const guard = task.user_profiles
                    const hoursLeft = task.deadline
                      ? Math.max(0, Math.floor((new Date(task.deadline).getTime() - Date.now()) / 3600000))
                      : null
                    const isNew = task.id === remTask?.id
                    return (
                      <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderTop: '1px solid var(--hairline-soft)' }}>
                        <span style={{ fontFamily: 'var(--disp)', fontWeight: 900, fontSize: 9, color: 'var(--signal)', width: 16 }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <LifeguardAvatar
                          name={guard?.name ?? '?'}
                          avatarColor={guard?.avatar_color}
                          size="sm"
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {guard?.name?.split(' ')[0]?.toUpperCase()}
                          </p>
                        </div>
                        <span style={{ fontSize: 8.5, fontWeight: 600, letterSpacing: '0.12em', whiteSpace: 'nowrap', color: isNew ? 'var(--aqua)' : 'rgba(239,236,227,0.4)' }}>
                          {isNew ? 'NEW' : hoursLeft !== null ? `${hoursLeft}H LEFT` : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <button
                className={cn('da-btn', !remTask && 'da-btn-aqua')}
                style={{ width: '100%' }}
                onClick={!remTask ? handleAssignRemediation : undefined}
                disabled={!!remTask || assigning}
              >
                {assigning ? 'Assigning…' : remTask ? 'Task assigned ✓' : 'Assign remediation'}
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <CheckCircle className="w-7 h-7" style={{ color: '#45e0ce', margin: '0 auto 10px' }} />
              <p style={{ margin: 0, fontFamily: 'var(--disp)', fontWeight: 700, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Audit passed
              </p>
              <p className="da-sub" style={{ marginTop: 6 }}>NO REMEDIATION NEEDED.</p>
            </div>
          )}

          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link href={`/roster/${audit.lifeguard_id}`} className="da-chip" style={{ justifyContent: 'space-between' }}>
              VIEW {guardName.split(' ')[0].toUpperCase()}&apos;S PROFILE <ChevronRight className="w-3 h-3" />
            </Link>
            <Link href="/schedule" className="da-chip" style={{ justifyContent: 'space-between' }}>
              BACK TO SCHEDULE <ChevronRight className="w-3 h-3" />
            </Link>
            <Link href="/audits/new" className="da-chip" style={{ justifyContent: 'space-between', color: 'var(--aqua)', borderColor: 'rgba(69,224,206,0.4)', opacity: 1 }}>
              START ANOTHER AUDIT <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
