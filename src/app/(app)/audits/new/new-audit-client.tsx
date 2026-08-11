'use client'

import './audit.css'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { LifeguardAvatar } from '@/components/shared/lifeguard-avatar'
import { cn } from '@/lib/utils'
import {
  Eye, Activity, Heart, Send, Shield, Smile, Sparkles,
  MapPin, WifiOff,
} from 'lucide-react'
import type { AuditType, UserProfile, CriterionResult, AuditCriterion } from '@/types'
import { submitAudit } from './actions'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { saveDraft, loadDraft, clearDraft, type AuditDraft } from '@/lib/audit-draft-store'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  scanning: <Eye className="w-6 h-6" />,
  vat: <Activity className="w-6 h-6" />,
  cpr_skills: <Heart className="w-6 h-6" />,
  dispatch: <Send className="w-6 h-6" />,
  supervisor_eavs: <Shield className="w-6 h-6" />,
  guest_service: <Smile className="w-6 h-6" />,
  cleaning: <Sparkles className="w-6 h-6" />,
}

interface CriterionState {
  criterion: AuditCriterion
  result: CriterionResult | null
  comment: string
}

interface NewAuditClientProps {
  auditTypes: AuditType[]
  lifeguards: UserProfile[]
  dueLookup: Record<string, string[]>
  zones: string[]
  supervisorId: string
  facilityId: string
  supervisorRole: string
  preselectedLifeguardId?: string
  preselectedAuditType?: string
}

function formatRelativeTime(savedAt: number): string {
  const mins = Math.floor((Date.now() - savedAt) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return hrs < 24 ? `${hrs}h ago` : 'yesterday'
}

function DaFonts() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;700;900&family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400&family=Fraunces:ital,opsz,wght@1,9..144,300..600&display=swap"
        rel="stylesheet"
      />
    </>
  )
}

function Ticks() {
  return (
    <>
      <i className="da-tick da-tick-tl" aria-hidden="true" />
      <i className="da-tick da-tick-tr" aria-hidden="true" />
      <i className="da-tick da-tick-bl" aria-hidden="true" />
      <i className="da-tick da-tick-br" aria-hidden="true" />
    </>
  )
}

export function NewAuditClient({
  auditTypes, lifeguards, dueLookup, zones,
  supervisorId, facilityId, supervisorRole,
  preselectedLifeguardId, preselectedAuditType,
}: NewAuditClientProps) {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(preselectedLifeguardId && preselectedAuditType ? 3 : 1)
  const [selectedType, setSelectedType] = useState<AuditType | null>(
    preselectedAuditType ? auditTypes.find((a) => a.name === preselectedAuditType) ?? null : null
  )
  const [selectedLifeguard, setSelectedLifeguard] = useState<UserProfile | null>(
    preselectedLifeguardId ? lifeguards.find((l) => l.id === preselectedLifeguardId) ?? null : null
  )
  const [selectedZone, setSelectedZone] = useState(zones[0] ?? '')
  const [criteriaStates, setCriteriaStates] = useState<CriterionState[]>([])
  const [activeCriterionIdx, setActiveCriterionIdx] = useState(0)
  const [coachText, setCoachText] = useState('')
  const [coachLoading, setCoachLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [auditId, setAuditId] = useState<string | null>(null)
  const [auditNotes, setAuditNotes] = useState('')
  const coachAbortRef = useRef<AbortController | null>(null)
  const isApplyingDraftRef = useRef(false)

  // Offline draft state
  const isOnline = useOnlineStatus()
  const [draftFound, setDraftFound] = useState<AuditDraft | null>(null)
  const [draftDismissed, setDraftDismissed] = useState(false)
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevIsOnlineRef = useRef<boolean>(true)

  const visibleTypes = auditTypes.filter((t) =>
    supervisorRole === 'manager' || supervisorRole === 'director' || !t.director_only
  )

  useEffect(() => {
    if (isApplyingDraftRef.current) {
      isApplyingDraftRef.current = false
      return
    }
    if (selectedType) {
      setCriteriaStates(selectedType.criteria.map((c) => ({ criterion: c, result: null, comment: '' })))
      setActiveCriterionIdx(0)
      setCoachText('')
    }
  }, [selectedType])

  const fetchCoachGuidance = useCallback(async (idx: number) => {
    if (!selectedType || !criteriaStates[idx]) return
    if (coachAbortRef.current) coachAbortRef.current.abort()
    const controller = new AbortController()
    coachAbortRef.current = controller
    setCoachLoading(true)
    setCoachText('')

    try {
      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criterion: criteriaStates[idx].criterion,
          audit_type: selectedType.name,
          cert_body: selectedType.cert_body,
          current_results: criteriaStates.map((s) => ({
            criterion_id: s.criterion.id,
            result: s.result,
          })),
          lifeguard_name: selectedLifeguard?.name ?? 'the lifeguard',
          lifeguard_id: selectedLifeguard?.id,
          zone: selectedZone,
        }),
        signal: controller.signal,
      })
      if (!response.body) return
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setCoachText((prev) => prev + decoder.decode(value))
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') setCoachText('Coach PC unavailable.')
    } finally {
      setCoachLoading(false)
    }
  }, [selectedType, criteriaStates, selectedLifeguard, selectedZone])

  useEffect(() => {
    if (step === 3 && criteriaStates.length > 0) {
      fetchCoachGuidance(activeCriterionIdx)
    }
  }, [activeCriterionIdx, step])

  useEffect(() => {
    if (step === 3 && !auditId && selectedType && selectedLifeguard) {
      createAuditRecord()
    }
  }, [step])

  // Auto-save draft to IndexedDB (debounced 800ms)
  useEffect(() => {
    if (step < 2 || !selectedType || !selectedLifeguard) return
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current)
    saveDebounceRef.current = setTimeout(() => {
      saveDraft({
        supervisorId, facilityId, step: step as 2 | 3,
        selectedTypeId: selectedType.id,
        selectedLifeguardId: selectedLifeguard.id,
        selectedZone,
        criteriaResults: criteriaStates.map((s) => ({
          criterionId: s.criterion.id,
          result: s.result,
          comment: s.comment,
        })),
        auditNotes, auditId, savedAt: Date.now(),
      })
    }, 800)
    return () => { if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current) }
  }, [step, selectedType, selectedLifeguard, selectedZone, criteriaStates, auditNotes, auditId])

  // Load draft on mount (skip if user arrived via preselected params)
  useEffect(() => {
    if (preselectedLifeguardId && preselectedAuditType) return
    loadDraft(supervisorId, facilityId).then((d) => { if (d) setDraftFound(d) })
  }, [])

  // Clear draft if the saved entities no longer exist (lifeguard deactivated, type removed)
  useEffect(() => {
    if (!draftFound) return
    const typeOk = auditTypes.some((t) => t.id === draftFound.selectedTypeId)
    const lgOk = lifeguards.some((l) => l.id === draftFound.selectedLifeguardId)
    if (!typeOk || !lgOk) { clearDraft(supervisorId, facilityId); setDraftFound(null) }
  }, [draftFound])

  // Auto-retry createAuditRecord and notify on reconnect
  useEffect(() => {
    const justReconnected = !prevIsOnlineRef.current && isOnline
    if (justReconnected) {
      if (step === 3 && !auditId && selectedType && selectedLifeguard) createAuditRecord()
      if (step === 3 && allAnswered) toast.info('Back online — you can submit now')
    }
    prevIsOnlineRef.current = isOnline
  }, [isOnline])

  // Resolve draft to full objects — null if entities no longer exist
  const resumableDraft = useMemo(() => {
    if (!draftFound || draftDismissed) return null
    const type = auditTypes.find((t) => t.id === draftFound.selectedTypeId) ?? null
    const lifeguard = lifeguards.find((l) => l.id === draftFound.selectedLifeguardId) ?? null
    if (!type || !lifeguard) return null
    return { draft: draftFound, type, lifeguard }
  }, [draftFound, draftDismissed, auditTypes, lifeguards])

  async function createAuditRecord(): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('audits')
        .insert({
          facility_id: facilityId,
          lifeguard_id: selectedLifeguard!.id,
          supervisor_id: supervisorId,
          audit_type_id: selectedType!.id,
          audit_type_name: selectedType!.name,
          status: 'in_progress',
          zone: selectedZone,
        })
        .select('id')
        .single()

      if (error || !data) {
        toast.error('Could not start audit — check your connection')
        return null
      }
      setAuditId(data.id)
      return data.id
    } catch {
      toast.error('Could not start audit — check your connection')
      return null
    }
  }

  function applyDraft(draft: AuditDraft, type: AuditType, lifeguard: UserProfile) {
    isApplyingDraftRef.current = true
    setSelectedType(type)
    setSelectedLifeguard(lifeguard)
    setSelectedZone(draft.selectedZone)
    setAuditId(draft.auditId)
    setAuditNotes(draft.auditNotes)
    const restored: CriterionState[] = type.criteria.map((c) => {
      const saved = draft.criteriaResults.find((r) => r.criterionId === c.id)
      return { criterion: c, result: saved?.result ?? null, comment: saved?.comment ?? '' }
    })
    setCriteriaStates(restored)
    const first = restored.findIndex((s) => s.result === null)
    setActiveCriterionIdx(first !== -1 ? first : restored.length - 1)
    setStep(draft.step)
    setDraftFound(null)
    setDraftDismissed(true)
  }

  function setResult(idx: number, result: CriterionResult) {
    setCriteriaStates((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], result }
      return next
    })
    const nextUnanswered = criteriaStates.findIndex((c, i) => i > idx && c.result === null)
    if (nextUnanswered !== -1) setActiveCriterionIdx(nextUnanswered)
  }

  function setComment(idx: number, comment: string) {
    setCriteriaStates((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], comment }
      return next
    })
  }

  const completedCount = criteriaStates.filter((c) => c.result !== null).length
  const allAnswered = completedCount === criteriaStates.length && criteriaStates.length > 0

  function computeScore(): { score: number; passed: boolean } {
    const weights = { pass: 1, needs_attention: 0.5, fail: 0 }
    const total = criteriaStates.reduce((sum, c) => sum + (c.result ? weights[c.result] : 0), 0)
    const score = criteriaStates.length > 0 ? (total / criteriaStates.length) * 5 : 0
    return { score: Math.round(score * 10) / 10, passed: score / 5 >= (selectedType?.pass_threshold ?? 0.7) }
  }

  async function handleSubmit() {
    if (!allAnswered || submitting) return
    setSubmitting(true)

    let effectiveAuditId = auditId
    if (!effectiveAuditId) {
      effectiveAuditId = await createAuditRecord()
      if (!effectiveAuditId) { setSubmitting(false); return }
    }

    const { score, passed } = computeScore()
    const resultsToInsert = criteriaStates.map((s) => ({
      audit_id: effectiveAuditId!,
      criterion_id: s.criterion.id,
      criterion_label: s.criterion.label,
      result: s.result!,
      comment: s.comment || null,
    }))

    const { error } = await submitAudit(
      effectiveAuditId, score, passed, resultsToInsert,
      auditNotes || undefined,
    )

    if (error) {
      toast.error(error)
      setSubmitting(false)
      return
    }

    await clearDraft(supervisorId, facilityId)
    toast.success('Audit submitted')
    router.push(`/audits/result/${effectiveAuditId}`)
  }

  const runningScore = computeScore()
  const progressPct = criteriaStates.length > 0
    ? Math.round((completedCount / criteriaStates.length) * 100)
    : 0

  const draftBanner = resumableDraft && (
    <div className="da-banner da-rise">
      <div>
        <p className="da-banner-title">Resume in-progress audit?</p>
        <p className="da-banner-sub">
          {resumableDraft.lifeguard.name.toUpperCase()} / {resumableDraft.type.display_name.toUpperCase()} / SAVED {formatRelativeTime(resumableDraft.draft.savedAt).toUpperCase()}
        </p>
      </div>
      <div className="flex gap-3 shrink-0">
        <button
          className="da-btn da-btn-ghost"
          style={{ padding: '10px 16px' }}
          onClick={() => {
            clearDraft(supervisorId, facilityId)
            setDraftFound(null)
            setDraftDismissed(true)
          }}
        >
          Start fresh
        </button>
        <button
          className="da-btn da-btn-aqua"
          style={{ padding: '10px 16px' }}
          onClick={() => applyDraft(resumableDraft.draft, resumableDraft.type, resumableDraft.lifeguard)}
        >
          Resume →
        </button>
      </div>
    </div>
  )

  // ─── STEP 1: Select Audit Type ─────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="da-root">
        <DaFonts />
        {draftBanner}

        <div className="da-head" style={{ marginTop: resumableDraft ? 20 : 0 }}>
          <div className="da-head-bar">
            <span>AUDIT://NEW/SELECT-PROTOCOL</span>
            <span className="da-rec">● REC</span>
          </div>
          <div className="da-head-main">
            <div>
              <h1 className="da-title da-rise">
                SELECT <span className="da-title-outline">PROTOCOL</span><span style={{ color: 'var(--signal)' }}>.</span>
              </h1>
              <p className="da-sub">SEQ 01/03 — <b>CHOOSE AN AUDIT TYPE TO BEGIN</b></p>
              <div className="da-seq" aria-hidden="true">
                <i className="on" /><i /><i />
              </div>
            </div>
          </div>
        </div>

        <div className="da-main">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl">
            {visibleTypes.map((type, i) => {
              const dueGuards = dueLookup[type.name] ?? []
              const dueLifeguards = lifeguards.filter((l) => dueGuards.includes(l.id))
              return (
                <button
                  key={type.id}
                  onClick={() => { setSelectedType(type); setStep(2) }}
                  className={cn('da-type da-ticks da-rise', selectedType?.id === type.id && 'is-selected')}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <Ticks />
                  <span className="da-type-no">P/{String(i + 1).padStart(2, '0')}</span>
                  <div className="da-type-icon">{TYPE_ICONS[type.name]}</div>
                  <h3 className="da-type-name">{type.display_name}</h3>
                  <div className="da-type-due">
                    {dueLifeguards.length === 0 ? (
                      <span className="da-type-due-label">NO AUDITS DUE TODAY</span>
                    ) : (
                      <>
                        {dueLifeguards.slice(0, 4).map((lg) => (
                          <LifeguardAvatar key={lg.id} name={lg.name} avatarColor={lg.avatar_color} size="sm" />
                        ))}
                        <span className="da-type-due-count">{dueLifeguards.length} DUE</span>
                      </>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ─── STEP 2: Select Lifeguard & Zone ───────────────────────────────────────
  if (step === 2) {
    return (
      <div className="da-root">
        <DaFonts />
        {draftBanner}

        <div className="da-head" style={{ marginTop: resumableDraft ? 20 : 0 }}>
          <div className="da-head-bar">
            <span>AUDIT://NEW/{selectedType?.name.toUpperCase().replace(/_/g, '-')}</span>
            <span className="da-rec">● REC</span>
          </div>
          <div className="da-head-main">
            <div>
              <h1 className="da-title da-rise">
                ASSIGN <em>guard &amp; zone.</em>
              </h1>
              <p className="da-sub">SEQ 02/03 — <b>{selectedType?.display_name.toUpperCase()}</b></p>
              <div className="da-seq" aria-hidden="true">
                <i className="on" /><i className="on" /><i />
              </div>
            </div>
          </div>
        </div>

        <div className="da-main">
          <div className="max-w-2xl space-y-8">
            <div>
              <label className="da-label">ROSTER / <b>SELECT LIFEGUARD</b></label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {lifeguards.map((lg) => {
                  const isDue = (dueLookup[selectedType?.name ?? ''] ?? []).includes(lg.id)
                  return (
                    <button
                      key={lg.id}
                      onClick={() => setSelectedLifeguard(lg)}
                      className={cn('da-guard', selectedLifeguard?.id === lg.id && 'is-selected')}
                    >
                      <LifeguardAvatar name={lg.name} avatarColor={lg.avatar_color} size="sm" />
                      <div className="min-w-0">
                        <p className="da-guard-name">{lg.name}</p>
                        {isDue && <p className="da-guard-due">▲ DUE TODAY</p>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="da-label">SECTOR / <b>ZONE ASSIGNMENT</b></label>
              <div className="flex flex-wrap gap-3">
                {zones.map((zone) => (
                  <button
                    key={zone}
                    onClick={() => setSelectedZone(zone)}
                    className={cn('da-zone', selectedZone === zone && 'is-selected')}
                  >
                    {zone}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button className="da-btn da-btn-ghost" onClick={() => setStep(1)}>
                ← Back
              </button>
              <button
                className="da-btn da-btn-aqua"
                disabled={!selectedLifeguard}
                onClick={() => setStep(3)}
              >
                Begin audit →
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── STEP 3: Complete Audit ────────────────────────────────────────────────
  const activeCriterion = criteriaStates[activeCriterionIdx]

  return (
    <div className="da-root">
      <DaFonts />

      <div className="da-head">
        <div className="da-head-bar">
          <span>AUDIT://LIVE/{selectedType?.name.toUpperCase().replace(/_/g, '-')}</span>
          <span className={isOnline ? 'da-rec' : ''} style={!isOnline ? { color: 'var(--amber)' } : undefined}>
            {isOnline ? '● REC' : '● OFFLINE'}
          </span>
        </div>
        <div className="da-head-main">
          <div>
            <h1 className="da-title">{selectedType?.display_name}</h1>
            <p className="da-sub">
              SEQ 03/03 — <b>{selectedLifeguard?.name.toUpperCase()}</b> / {selectedZone.toUpperCase()} / {completedCount} OF {criteriaStates.length} · {progressPct}%
            </p>
          </div>
          <div className="da-score">
            <div className={cn('da-score-val', completedCount > 0 && !runningScore.passed && 'is-low')}>
              {completedCount > 0 ? runningScore.score.toFixed(1) : '—'}
            </div>
            <div className="da-score-label">RUNNING SCORE / 5.0</div>
          </div>
        </div>
        <div className="da-segs" aria-hidden="true">
          {criteriaStates.map((s) => (
            <i
              key={s.criterion.id}
              className={s.result === 'pass' ? 'pass' : s.result === 'needs_attention' ? 'attn' : s.result === 'fail' ? 'fail' : ''}
            />
          ))}
        </div>
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div className="da-offline">
          <WifiOff className="w-3.5 h-3.5 shrink-0" />
          NO CONNECTION — ANSWERS SAVED LOCALLY
        </div>
      )}

      <div className="da-body">
        {/* Left: criteria list */}
        <div className="da-main space-y-4">
          {criteriaStates.map((state, idx) => (
            <div
              key={state.criterion.id}
              onClick={() => { setActiveCriterionIdx(idx); fetchCoachGuidance(idx) }}
              className={cn('da-crit da-ticks', activeCriterionIdx === idx && 'is-active')}
            >
              {activeCriterionIdx === idx && <Ticks />}
              <div className="da-crit-top">
                <span className="da-crit-no">C/{String(idx + 1).padStart(2, '0')}</span>
                <p className="da-crit-label">{state.criterion.label}</p>
                {state.result && (
                  <span className={cn(
                    'da-pill',
                    state.result === 'pass' && 'da-pill-pass',
                    state.result === 'needs_attention' && 'da-pill-attn',
                    state.result === 'fail' && 'da-pill-fail',
                  )}>
                    {state.result === 'pass' ? '✓ PASS' : state.result === 'needs_attention' ? '△ ATTN' : '✕ FAIL'}
                  </span>
                )}
              </div>

              <div className="da-verdicts">
                {(['pass', 'needs_attention', 'fail'] as CriterionResult[]).map((r) => (
                  <button
                    key={r}
                    onClick={(e) => { e.stopPropagation(); setResult(idx, r) }}
                    className={cn(
                      'da-verdict',
                      r === 'pass' ? 'da-verdict-pass' : r === 'needs_attention' ? 'da-verdict-attn' : 'da-verdict-fail',
                      state.result === r && 'is-on',
                    )}
                  >
                    {r === 'pass' ? 'PASS' : r === 'needs_attention' ? 'NEEDS ATTN' : 'FAIL'}
                  </button>
                ))}
              </div>

              {(activeCriterionIdx === idx || state.comment) && (
                <textarea
                  className="da-textarea"
                  placeholder="OPTIONAL NOTE ON THIS CRITERION..."
                  rows={1}
                  value={state.comment}
                  onChange={(e) => setComment(idx, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
          ))}

          {/* Notes — shown after all criteria are answered */}
          {allAnswered && (
            <div className="da-notes da-rise">
              <label className="da-label" style={{ marginBottom: 6 }}>
                SESSION LOG / <b>AUDIT NOTES</b> <span style={{ opacity: 0.4 }}>(OPTIONAL)</span>
              </label>
              <p className="text-[9.5px] tracking-[0.08em] opacity-50">
                Conditions, anomalies, or anything worth documenting about this session.
              </p>
              <textarea
                className="da-textarea"
                placeholder='E.G. "PEAK CROWD, WATER CHOPPY FROM WAVE POOL. GUARD WAS DISTRACTED BY GUEST INTERACTION MID-SCAN."'
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* Submit */}
          <div className="pt-2 pb-6">
            <button
              disabled={!allAnswered || submitting || !isOnline}
              onClick={handleSubmit}
              className="da-btn da-btn-aqua w-full"
              style={{ padding: '17px 22px' }}
            >
              {submitting
                ? 'TRANSMITTING...'
                : !isOnline
                ? 'OFFLINE — CONNECT TO SUBMIT'
                : allAnswered
                ? 'SUBMIT AUDIT — COMMIT TO RECORD →'
                : `${criteriaStates.length - completedCount} CRITERIA REMAINING`}
            </button>
          </div>
        </div>

        {/* Right: Coach PC panel */}
        <div className="da-coach">
          <i className="da-coach-scan" aria-hidden="true" />

          <div className="da-coach-head">
            <span className="da-coach-glyph" aria-hidden="true">✦</span>
            <div className="flex-1 min-w-0">
              <p className="da-coach-name">COACH PC</p>
              <p className="da-coach-sub">REAL-TIME GUIDANCE</p>
            </div>
            <span className={!isOnline ? '' : coachLoading ? 'da-rec-aqua' : 'da-rec-aqua'} style={{ fontSize: 8, letterSpacing: '0.18em', color: !isOnline ? 'var(--amber)' : 'var(--aqua)' }}>
              {!isOnline ? '● OFFLINE' : coachLoading ? '● STREAMING' : '● LIVE'}
            </span>
          </div>

          {/* Context chips */}
          <div className="px-[18px] pt-4 pb-1 flex flex-wrap gap-2">
            <span className="da-chip">
              <MapPin className="w-2.5 h-2.5" /> {selectedZone}
            </span>
            <span className="da-chip">{selectedLifeguard?.name}</span>
          </div>

          {/* AI guidance */}
          <div className="flex-1 overflow-y-auto px-[18px] py-4">
            {!isOnline ? (
              <div className="flex items-center gap-2 mt-1" style={{ color: 'var(--amber)' }}>
                <WifiOff className="w-3.5 h-3.5 shrink-0" />
                <p className="text-[10px] tracking-[0.1em] opacity-80">OFFLINE — GUIDANCE UNAVAILABLE</p>
              </div>
            ) : activeCriterion ? (
              <div className="space-y-4">
                {/* Current criterion label */}
                <div>
                  <p className="da-eyebrow mb-2">EVALUATING NOW</p>
                  <p className="text-[11px] font-semibold leading-relaxed tracking-[0.04em] uppercase">
                    {activeCriterion.criterion.label}
                  </p>
                  <span className={cn(
                    'da-liab',
                    activeCriterion.criterion.liability_weight === 'critical' ? 'da-liab-critical' :
                    activeCriterion.criterion.liability_weight === 'high' ? 'da-liab-high' :
                    'da-liab-standard'
                  )}>
                    {activeCriterion.criterion.liability_weight} liability
                  </span>
                </div>

                {/* AI coaching text */}
                <div className="da-coach-msg">
                  {coachLoading && !coachText ? (
                    <span className="text-[9px] tracking-[0.2em] opacity-50">
                      ANALYZING<i className="da-caret" aria-hidden="true" />
                    </span>
                  ) : coachText ? (
                    <>
                      {coachText}
                      {coachLoading && <i className="da-caret" aria-hidden="true" />}
                    </>
                  ) : (
                    <span className="text-[10px] italic opacity-40">Select a criterion to get guidance.</span>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* Footer — liability weight legend */}
          <div className="da-coach-foot">
            <p className="da-eyebrow">LIABILITY KEY</p>
            <div className="da-legend">
              <span style={{ color: 'var(--signal)' }}>■ CRITICAL</span>
              <span style={{ color: 'var(--amber)' }}>■ HIGH</span>
              <span style={{ opacity: 0.4 }}>■ STANDARD</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
