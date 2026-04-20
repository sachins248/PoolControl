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
  Eye, Activity, Heart, Send, Shield, Smile, Sparkles, ChevronRight, ChevronLeft, Bot,
} from 'lucide-react'
import type { AuditType, UserProfile, CriterionResult, AuditCriterion } from '@/types'

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

  // Step 1: pick type; Step 2: pick lifeguard+context; Step 3: audit form
  const [step, setStep] = useState(preselectedLifeguardId && preselectedAuditType ? 3 : 1)
  const [selectedType, setSelectedType] = useState<AuditType | null>(
    preselectedAuditType ? auditTypes.find((a) => a.name === preselectedAuditType) ?? null : null
  )
  const [selectedLifeguard, setSelectedLifeguard] = useState<UserProfile | null>(
    preselectedLifeguardId ? lifeguards.find((l) => l.id === preselectedLifeguardId) ?? null : null
  )
  const [selectedZone, setSelectedZone] = useState(zones[0] ?? '')
  const [contextNotes, setContextNotes] = useState('')
  const [criteriaStates, setCriteriaStates] = useState<CriterionState[]>([])
  const [activeCriterionIdx, setActiveCriterionIdx] = useState(0)
  const [coachText, setCoachText] = useState('')
  const [coachLoading, setCoachLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [auditId, setAuditId] = useState<string | null>(null)
  const coachAbortRef = useRef<AbortController | null>(null)

  // Visible audit types — filter director_only unless role is director
  const visibleTypes = auditTypes.filter((t) =>
    supervisorRole === 'director' || !t.director_only
  )

  // When type is selected, initialize criteria states
  useEffect(() => {
    if (selectedType) {
      setCriteriaStates(
        selectedType.criteria.map((c) => ({ criterion: c, result: null, comment: '' }))
      )
      setActiveCriterionIdx(0)
      setCoachText('')
    }
  }, [selectedType])

  // Fetch Coach PC guidance when active criterion changes
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
      if (e.name !== 'AbortError') setCoachText('Coach PC unavailable — check your connection.')
    } finally {
      setCoachLoading(false)
    }
  }, [selectedType, criteriaStates, selectedLifeguard, selectedZone])

  useEffect(() => {
    if (step === 3 && criteriaStates.length > 0) {
      fetchCoachGuidance(activeCriterionIdx)
    }
  }, [activeCriterionIdx, step])

  // Create audit record in DB on entering step 3
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
        notes: contextNotes || null,
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
    // Advance to next unanswered criterion
    const nextUnanswered = criteriaStates.findIndex((c, i) => i > idx && c.result === null)
    if (nextUnanswered !== -1) {
      setActiveCriterionIdx(nextUnanswered)
    }
  }

  function setComment(idx: number, comment: string) {
    setCriteriaStates((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], comment }
      return next
    })
  }

  const completedCount = criteriaStates.filter((c) => c.result !== null).length
  const allAnswered = completedCount === criteriaStates.length

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

    // Save criteria results
    const resultsToInsert = criteriaStates.map((s) => ({
      audit_id: auditId,
      criterion_id: s.criterion.id,
      criterion_label: s.criterion.label,
      result: s.result!,
      comment: s.comment || null,
    }))

    await supabase.from('audit_criteria_results').insert(resultsToInsert)

    // Update audit status
    await supabase
      .from('audits')
      .update({ status: 'completed', score, passed, submitted_at: new Date().toISOString() })
      .eq('id', auditId)

    // Log action
    await supabase.from('audit_log').insert({
      facility_id: facilityId,
      user_id: supervisorId,
      action: 'audit_submitted',
      entity_type: 'audit',
      entity_id: auditId,
      metadata: { score, passed, lifeguard_id: selectedLifeguard?.id },
    })

    toast.success('Audit submitted successfully')
    router.push(`/audits/result/${auditId}`)
  }

  const runningScore = computeScore()

  // ─── STEP 1: Select Audit Type ─────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-[#0f1e2e] text-white px-8 py-5">
          <h1 className="text-xl font-bold">New Audit</h1>
          <p className="text-white/50 text-sm mt-0.5">Step 1 of 3: Select Audit Type</p>
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
                    selectedType?.id === type.id
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-gray-200'
                  )}
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 mb-3">
                    {TYPE_ICONS[type.name]}
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                    {type.display_name}
                  </h3>
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

  // ─── STEP 2: Select Lifeguard & Context ────────────────────────────────────
  if (step === 2) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-[#0f1e2e] text-white px-8 py-5">
          <h1 className="text-xl font-bold">New Audit — {selectedType?.display_name}</h1>
          <p className="text-white/50 text-sm mt-0.5">Step 2 of 3: Select Lifeguard &amp; Context</p>
          <div className="mt-3 flex gap-1">
            <div className="h-1 w-16 rounded-full bg-emerald-400" />
            <div className="h-1 w-16 rounded-full bg-emerald-400" />
            <div className="h-1 w-16 rounded-full bg-white/20" />
          </div>
        </div>

        <div className="flex-1 px-8 py-6 max-w-xl">
          <div className="space-y-5">
            {/* Lifeguard picker */}
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
                        {isDue && (
                          <p className="text-[10px] text-amber-600 font-medium">Due today</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Zone picker */}
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

            {/* Optional notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <Textarea
                placeholder='e.g. "Crowded — peak Saturday afternoon"'
                value={contextNotes}
                onChange={(e) => setContextNotes(e.target.value)}
                rows={2}
                className="resize-none"
              />
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
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-[#0f1e2e] text-white px-8 py-4">
        <h1 className="text-lg font-bold">New Audit — {selectedType?.display_name}</h1>
        <p className="text-white/50 text-sm">
          Step 3 of 3: Complete Audit · Lifeguard: {selectedLifeguard?.name} · Zone: {selectedZone}
        </p>
        <div className="mt-3 flex gap-1">
          <div className="h-1 w-16 rounded-full bg-emerald-400" />
          <div className="h-1 w-16 rounded-full bg-emerald-400" />
          <div className="h-1 w-16 rounded-full bg-emerald-400" />
        </div>
      </div>

      {/* Body — two panel */}
      <div className="flex-1 flex min-h-0">
        {/* Left: criteria */}
        <div className="flex-1 overflow-y-auto px-6 py-5 border-r border-gray-200">
          {/* Context strip */}
          <div className="flex gap-4 mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Type of Pool</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedZone}</p>
            </div>
            <div className="border-l border-gray-200 pl-4">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Lifeguard</p>
              <p className="text-sm font-medium text-gray-900 mt-0.5">{selectedLifeguard?.name}</p>
            </div>
          </div>

          <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
            Criteria · {completedCount} of {criteriaStates.length} completed
          </p>

          <div className="space-y-3">
            {criteriaStates.map((state, idx) => (
              <div
                key={state.criterion.id}
                onClick={() => { setActiveCriterionIdx(idx); fetchCoachGuidance(idx) }}
                className={cn(
                  'rounded-xl border p-4 cursor-pointer transition-all',
                  activeCriterionIdx === idx
                    ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-300'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <p className={cn(
                    'text-sm font-medium text-gray-900',
                    activeCriterionIdx === idx && 'text-blue-900'
                  )}>
                    {activeCriterionIdx === idx && (
                      <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2 mb-0.5" />
                    )}
                    {state.criterion.label}
                    {activeCriterionIdx === idx && (
                      <span className="ml-2 text-xs text-blue-500 font-normal">— Evaluating now</span>
                    )}
                  </p>
                  {state.result && (
                    <span className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap',
                      state.result === 'pass' && 'bg-emerald-100 text-emerald-700',
                      state.result === 'needs_attention' && 'bg-amber-100 text-amber-700',
                      state.result === 'fail' && 'bg-red-100 text-red-700',
                    )}>
                      {state.result === 'pass' && '✓ Pass'}
                      {state.result === 'needs_attention' && '△ Needs Attention'}
                      {state.result === 'fail' && '✕ Fail'}
                    </span>
                  )}
                </div>

                {/* Three-button input */}
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
                          : r === 'pass' ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                          : r === 'needs_attention' ? 'border-amber-300 text-amber-700 hover:bg-amber-50'
                          : 'border-red-300 text-red-700 hover:bg-red-50'
                      )}
                    >
                      {r === 'pass' ? 'PASS' : r === 'needs_attention' ? 'NEEDS ATTENTION' : 'FAIL'}
                    </button>
                  ))}
                </div>

                {/* Optional comment (shows if criterion is active or has a comment) */}
                {(activeCriterionIdx === idx || state.comment) && (
                  <Textarea
                    className="mt-2 text-xs resize-none"
                    placeholder="Optional note..."
                    rows={1}
                    value={state.comment}
                    onChange={(e) => { e.stopPropagation(); setComment(idx, e.target.value) }}
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Submit */}
          <div className="pt-4">
            <Button
              disabled={!allAnswered || submitting}
              onClick={handleSubmit}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3"
            >
              {submitting ? 'Submitting...' : 'Submit Audit'}
            </Button>
          </div>
        </div>

        {/* Right: Coach PC */}
        <div className="w-80 shrink-0 bg-[#0f1e2e] text-white flex flex-col">
          {/* Coach header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold">Coach PC</p>
              <p className="text-xs text-white/40">AI Audit Assistant</p>
            </div>
            <div className={cn(
              'ml-auto w-2 h-2 rounded-full',
              coachLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
            )} />
          </div>

          {/* Coach content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm">
            {criteriaStates[activeCriterionIdx] && (
              <>
                <div>
                  <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold mb-2">
                    Currently Evaluating
                  </p>
                  <div className="bg-white/5 rounded-lg p-3 text-white/80 text-xs leading-relaxed min-h-[60px]">
                    {coachLoading && !coachText ? (
                      <span className="animate-pulse text-white/40">Coach PC is thinking...</span>
                    ) : (
                      coachText || (
                        <span className="text-white/30">
                          Click a criterion to get guidance from Coach PC.
                        </span>
                      )
                    )}
                  </div>
                </div>

                {/* What to look for — static from criterion data */}
                {criteriaStates[activeCriterionIdx].criterion.what_to_look_for?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold mb-2">
                      What to Look For
                    </p>
                    <ul className="space-y-1">
                      {criteriaStates[activeCriterionIdx].criterion.what_to_look_for.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                          <span className="text-white/30 mt-0.5">•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Running score */}
          <div className="px-5 py-4 border-t border-white/10">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-white/40 mb-1">Running Score</p>
                <p className="text-3xl font-bold text-white">
                  {completedCount > 0 ? runningScore.score.toFixed(1) : '—'}
                </p>
                <p className="text-xs text-white/40 mt-0.5">
                  Based on {completedCount} of {criteriaStates.length} criteria
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/40 mb-1">Audit progress</p>
                <p className="text-sm font-semibold text-white">
                  {criteriaStates.length > 0
                    ? Math.round((completedCount / criteriaStates.length) * 100)
                    : 0}%
                </p>
              </div>
            </div>
            <div className="mt-2 w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all"
                style={{
                  width: criteriaStates.length > 0
                    ? `${(completedCount / criteriaStates.length) * 100}%`
                    : '0%'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
