'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { LifeguardAvatar } from '@/components/shared/lifeguard-avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  Eye, Activity, Heart, Send, Shield, Smile, Sparkles, ChevronRight, ChevronLeft,
  MapPin, Zap,
} from 'lucide-react'
import type { AuditType, UserProfile, CriterionResult, AuditCriterion } from '@/types'
import { submitAudit } from './actions'

const TYPE_ICONS: Record<string, React.ReactNode> = {
  scanning: <Eye className="w-8 h-8" />,
  vat: <Activity className="w-8 h-8" />,
  cpr_skills: <Heart className="w-8 h-8" />,
  dispatch: <Send className="w-8 h-8" />,
  supervisor_eavs: <Shield className="w-8 h-8" />,
  guest_service: <Smile className="w-8 h-8" />,
  cleaning: <Sparkles className="w-8 h-8" />,
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

  const visibleTypes = auditTypes.filter((t) =>
    supervisorRole === 'manager' || supervisorRole === 'director' || !t.director_only
  )

  useEffect(() => {
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

  async function createAuditRecord() {
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
    if (!error && data) setAuditId(data.id)
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
    if (!allAnswered || !auditId) return
    setSubmitting(true)
    const { score, passed } = computeScore()

    const resultsToInsert = criteriaStates.map((s) => ({
      audit_id: auditId,
      criterion_id: s.criterion.id,
      criterion_label: s.criterion.label,
      result: s.result!,
      comment: s.comment || null,
    }))

    const { error } = await submitAudit(
      auditId, score, passed, resultsToInsert,
      auditNotes || undefined,
    )

    if (error) {
      toast.error(error)
      setSubmitting(false)
      return
    }

    toast.success('Audit submitted')
    router.push(`/audits/result/${auditId}`)
  }

  const runningScore = computeScore()
  const progressPct = criteriaStates.length > 0
    ? Math.round((completedCount / criteriaStates.length) * 100)
    : 0

  // ─── STEP 1: Select Audit Type ─────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-[#0f1e2e] text-white px-8 py-5">
          <h1 className="text-xl font-bold">New Audit</h1>
          <p className="text-white/50 text-sm mt-0.5">Step 1 of 3 — Select audit type</p>
          <div className="mt-3 flex gap-1">
            <div className="h-1 w-16 rounded-full bg-emerald-400" />
            <div className="h-1 w-16 rounded-full bg-white/20" />
            <div className="h-1 w-16 rounded-full bg-white/20" />
          </div>
        </div>

        <div className="flex-1 px-8 py-6">
          <div className="grid grid-cols-3 gap-4 max-w-4xl">
            {visibleTypes.map((type) => {
              const dueGuards = dueLookup[type.name] ?? []
              const dueLifeguards = lifeguards.filter((l) => dueGuards.includes(l.id))
              return (
                <button
                  key={type.id}
                  onClick={() => { setSelectedType(type); setStep(2) }}
                  className={cn(
                    'bg-white border-2 rounded-2xl p-5 text-left transition-all hover:shadow-md hover:border-emerald-300',
                    selectedType?.id === type.id ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200'
                  )}
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 mb-3">
                    {TYPE_ICONS[type.name]}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight">{type.display_name}</h3>
                  <div className="mt-3 flex items-center gap-1 flex-wrap min-h-[28px]">
                    {dueLifeguards.length === 0 ? (
                      <span className="text-xs text-gray-400 italic">No audits due today</span>
                    ) : (
                      dueLifeguards.slice(0, 4).map((lg) => (
                        <LifeguardAvatar key={lg.id} name={lg.name} avatarColor={lg.avatar_color} size="sm" />
                      ))
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
      <div className="flex flex-col h-full">
        <div className="bg-[#0f1e2e] text-white px-8 py-5">
          <h1 className="text-xl font-bold">New Audit — {selectedType?.display_name}</h1>
          <p className="text-white/50 text-sm mt-0.5">Step 2 of 3 — Select lifeguard &amp; zone</p>
          <div className="mt-3 flex gap-1">
            <div className="h-1 w-16 rounded-full bg-emerald-400" />
            <div className="h-1 w-16 rounded-full bg-emerald-400" />
            <div className="h-1 w-16 rounded-full bg-white/20" />
          </div>
        </div>

        <div className="flex-1 px-8 py-6 max-w-xl">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Lifeguard</label>
              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                {lifeguards.map((lg) => {
                  const isDue = (dueLookup[selectedType?.name ?? ''] ?? []).includes(lg.id)
                  return (
                    <button
                      key={lg.id}
                      onClick={() => setSelectedLifeguard(lg)}
                      className={cn(
                        'flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all',
                        selectedLifeguard?.id === lg.id
                          ? 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-400'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      )}
                    >
                      <LifeguardAvatar name={lg.name} avatarColor={lg.avatar_color} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{lg.name}</p>
                        {isDue && <p className="text-[10px] text-amber-600 font-medium">Due today</p>}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Zone / Pool</label>
              <div className="flex flex-wrap gap-2">
                {zones.map((zone) => (
                  <button
                    key={zone}
                    onClick={() => setSelectedZone(zone)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium border transition-all',
                      selectedZone === zone
                        ? 'bg-emerald-500 text-white border-emerald-500'
                        : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
                    )}
                  >
                    {zone}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button
                disabled={!selectedLifeguard}
                onClick={() => setStep(3)}
                className="bg-emerald-500 hover:bg-emerald-400 text-white"
              >
                Start Audit <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── STEP 3: Complete Audit ────────────────────────────────────────────────
  const activeCriterion = criteriaStates[activeCriterionIdx]

  return (
    <div className="flex flex-col h-full">
      <div className="bg-[#0f1e2e] text-white px-8 py-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-lg font-bold">{selectedType?.display_name}</h1>
            <p className="text-white/40 text-xs mt-0.5">
              Step 3 of 3 &nbsp;·&nbsp; {selectedLifeguard?.name} &nbsp;·&nbsp; {selectedZone}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-2xl font-bold text-white">
              {completedCount > 0 ? runningScore.score.toFixed(1) : '—'}
            </p>
            <p className="text-[10px] text-white/30 uppercase tracking-wide">Running score</p>
          </div>
        </div>
        <div className="mt-3 w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-[10px] text-white/30 mt-1">{completedCount} of {criteriaStates.length} criteria · {progressPct}%</p>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left: criteria list */}
        <div className="flex-1 overflow-y-auto px-6 py-5 border-r border-gray-200 space-y-3">
          {criteriaStates.map((state, idx) => (
            <div
              key={state.criterion.id}
              onClick={() => { setActiveCriterionIdx(idx); fetchCoachGuidance(idx) }}
              className={cn(
                'rounded-xl border p-4 cursor-pointer transition-all',
                activeCriterionIdx === idx
                  ? 'border-blue-400 bg-blue-50/40 ring-1 ring-blue-300'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <p className={cn(
                  'text-sm font-medium',
                  activeCriterionIdx === idx ? 'text-blue-900' : 'text-gray-900'
                )}>
                  {activeCriterionIdx === idx && (
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2 mb-0.5" />
                  )}
                  {state.criterion.label}
                </p>
                {state.result && (
                  <span className={cn(
                    'text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shrink-0',
                    state.result === 'pass' && 'bg-emerald-100 text-emerald-700',
                    state.result === 'needs_attention' && 'bg-amber-100 text-amber-700',
                    state.result === 'fail' && 'bg-red-100 text-red-700',
                  )}>
                    {state.result === 'pass' ? '✓ Pass' : state.result === 'needs_attention' ? '△ Attention' : '✕ Fail'}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                {(['pass', 'needs_attention', 'fail'] as CriterionResult[]).map((r) => (
                  <button
                    key={r}
                    onClick={(e) => { e.stopPropagation(); setResult(idx, r) }}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-lg text-xs font-semibold border transition-all',
                      state.result === r
                        ? r === 'pass' ? 'bg-emerald-500 text-white border-emerald-500'
                        : r === 'needs_attention' ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-red-500 text-white border-red-500'
                        : r === 'pass' ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        : r === 'needs_attention' ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                        : 'border-red-200 text-red-700 hover:bg-red-50'
                    )}
                  >
                    {r === 'pass' ? 'PASS' : r === 'needs_attention' ? 'NEEDS ATTN' : 'FAIL'}
                  </button>
                ))}
              </div>

              {(activeCriterionIdx === idx || state.comment) && (
                <Textarea
                  className="mt-2 text-xs resize-none"
                  placeholder="Optional note on this criterion..."
                  rows={1}
                  value={state.comment}
                  onChange={(e) => { e.stopPropagation(); setComment(idx, e.target.value) }}
                  onClick={(e) => e.stopPropagation()}
                />
              )}
            </div>
          ))}

          {/* Notes — shown after all criteria are answered */}
          {allAnswered && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
              <p className="text-sm font-medium text-gray-700">Audit Notes <span className="text-gray-400 font-normal">(optional)</span></p>
              <p className="text-xs text-gray-400">Conditions, anomalies, or anything worth documenting about this session.</p>
              <Textarea
                placeholder='e.g. "Peak crowd, water choppy from wave pool. Guard was distracted by guest interaction mid-scan."'
                value={auditNotes}
                onChange={(e) => setAuditNotes(e.target.value)}
                rows={3}
                className="resize-none bg-white"
              />
            </div>
          )}

          {/* Submit */}
          <div className="pt-2 pb-6">
            <Button
              disabled={!allAnswered || submitting}
              onClick={handleSubmit}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-semibold py-3 text-base"
            >
              {submitting ? 'Submitting...' : allAnswered ? 'Submit Audit' : `${criteriaStates.length - completedCount} criteria remaining`}
            </Button>
          </div>
        </div>

        {/* Right: Coach PC panel */}
        <div className="w-72 shrink-0 bg-[#0a1628] text-white flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight">Coach PC</p>
              <p className="text-[10px] text-white/40">Real-time guidance</p>
            </div>
            <div className={cn(
              'w-1.5 h-1.5 rounded-full shrink-0',
              coachLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
            )} />
          </div>

          {/* Context chips */}
          <div className="px-5 pt-4 pb-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/8 border border-white/10 text-[10px] text-white/60">
              <MapPin className="w-2.5 h-2.5" /> {selectedZone}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/8 border border-white/10 text-[10px] text-white/60">
              {selectedLifeguard?.name}
            </span>
          </div>

          {/* AI guidance */}
          <div className="flex-1 overflow-y-auto px-5 py-3">
            {activeCriterion && (
              <div className="space-y-3">
                {/* Current criterion label */}
                <div>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest mb-1.5">Evaluating now</p>
                  <p className="text-xs font-semibold text-white/90 leading-snug">
                    {activeCriterion.criterion.label}
                  </p>
                  <span className={cn(
                    'inline-block mt-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded',
                    activeCriterion.criterion.liability_weight === 'critical' ? 'bg-red-500/20 text-red-400' :
                    activeCriterion.criterion.liability_weight === 'high' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-white/10 text-white/40'
                  )}>
                    {activeCriterion.criterion.liability_weight} liability
                  </span>
                </div>

                {/* AI coaching text */}
                <div className="relative">
                  <div className="absolute -left-1 top-0 bottom-0 w-0.5 bg-emerald-500/50 rounded-full" />
                  <div className="pl-3">
                    {coachLoading && !coachText ? (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-0.5">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="w-1 h-1 rounded-full bg-white/30 animate-bounce"
                              style={{ animationDelay: `${i * 120}ms` }}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-white/30">Analyzing...</span>
                      </div>
                    ) : coachText ? (
                      <p className="text-sm text-white/90 leading-relaxed">{coachText}</p>
                    ) : (
                      <p className="text-xs text-white/25 italic">Select a criterion to get guidance.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer — liability weight legend */}
          <div className="px-5 py-4 border-t border-white/10 space-y-2">
            <p className="text-[9px] text-white/25 uppercase tracking-widest">Liability key</p>
            <div className="flex gap-3">
              <span className="text-[9px] text-red-400">● Critical</span>
              <span className="text-[9px] text-amber-400">● High</span>
              <span className="text-[9px] text-white/30">● Standard</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
