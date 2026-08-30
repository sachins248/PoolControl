'use client'

import { useState, useTransition } from 'react'
import { FlaskConical, TrendingUp, ShieldCheck, Loader2, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { saveLiabilityModel, clearLiabilityModel } from './actions'
import type { TrendBucket, GuardSeries, RecoveryArc } from './page'
import type { LiabilityModel } from '@/types'

const AQUA = '#45e0ce'
const SIGNAL = '#ff4a1a'
const GRID = 'rgba(239,236,227,0.09)'
const TICK = 'rgba(239,236,227,0.4)'

const TYPE_LABEL: Record<string, string> = {
  scanning: 'Scanning', vat: 'VAT', cpr_skills: 'CPR / Skills', dispatch: 'Dispatch',
}

interface Props {
  trends: Record<string, TrendBucket[]>
  guardSeries: GuardSeries[]
  arcs: RecoveryArc[]
  teamBefore: number
  teamAfter: number
  windowDays: number
  totalAudits: number
  /** Facility-supplied actuarial inputs. Null until someone enters them. */
  liabilityModel: LiabilityModel | null
  canConfigure: boolean
  incidentStats: { total: number; saves: number; severe: number; emsCalls: number }
}

/* ── Small-multiple trend line (single aqua series — no legend needed) ─────── */
function TrendPanel({ type, buckets }: { type: string; buckets: TrendBucket[] }) {
  const W = 260, H = 96, PAD_L = 24, PAD_R = 8, PAD_T = 10, PAD_B = 18
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B
  const x = (i: number) => PAD_L + (i / (buckets.length - 1)) * innerW
  const y = (v: number) => PAD_T + (1 - (v - 1) / 4) * innerH // domain 1..5

  const pts = buckets
    .map((b, i) => (b.avg !== null ? { i, v: b.avg, n: b.n, label: b.label } : null))
    .filter(Boolean) as { i: number; v: number; n: number; label: string }[]

  const path = pts.map((p, k) => `${k === 0 ? 'M' : 'L'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')
  const last = pts[pts.length - 1]
  const first = pts[0]
  const delta = last && first ? last.v - first.v : 0

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{TYPE_LABEL[type] ?? type}</p>
        {last && (
          <p className="text-xs">
            <span className="font-bold text-gray-900">{last.v.toFixed(1)}</span>
            <span className={`ml-1.5 font-semibold ${delta >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}
            </span>
          </p>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${TYPE_LABEL[type]} average score trend`}>
        {[2, 3, 4, 5].map((v) => (
          <g key={v}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth="1" />
            <text x={PAD_L - 5} y={y(v) + 3} fontSize="8" fill={TICK} textAnchor="end" fontFamily="inherit">{v}</text>
          </g>
        ))}
        {pts.length > 1 && <path d={path} fill="none" stroke={AQUA} strokeWidth="2" />}
        {pts.map((p) => (
          <rect key={p.i} x={x(p.i) - 3} y={y(p.v) - 3} width="6" height="6" fill={AQUA}>
            <title>{`${p.label}: avg ${p.v.toFixed(1)} (${p.n} audit${p.n !== 1 ? 's' : ''})`}</title>
          </rect>
        ))}
        <text x={PAD_L} y={H - 4} fontSize="8" fill={TICK} fontFamily="inherit">{buckets[0].label}</text>
        <text x={W - PAD_R} y={H - 4} fontSize="8" fill={TICK} textAnchor="end" fontFamily="inherit">now</text>
      </svg>
    </div>
  )
}

/* ── Per-guard trajectory: aqua line, square = pass, ✕ = fail ──────────────── */
function GuardChart({ guard }: { guard: GuardSeries }) {
  const W = 560, H = 150, PAD_L = 26, PAD_R = 14, PAD_T = 12, PAD_B = 22
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B
  const pts = [...guard.points].sort((a, b) => b.daysAgo - a.daysAgo)
  const maxDays = Math.max(...pts.map((p) => p.daysAgo), 1)
  const x = (d: number) => PAD_L + (1 - d / maxDays) * innerW
  const y = (v: number) => PAD_T + (1 - (v - 1) / 4) * innerH

  const path = pts.map((p, k) => `${k === 0 ? 'M' : 'L'}${x(p.daysAgo).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${guard.name} score trajectory`}>
      {[1, 2, 3, 4, 5].map((v) => (
        <g key={v}>
          <line x1={PAD_L} x2={W - PAD_R} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth="1" />
          <text x={PAD_L - 5} y={y(v) + 3} fontSize="8" fill={TICK} textAnchor="end" fontFamily="inherit">{v}</text>
        </g>
      ))}
      <path d={path} fill="none" stroke={AQUA} strokeWidth="2" opacity="0.8" />
      {pts.map((p, i) =>
        p.passed ? (
          <rect key={i} x={x(p.daysAgo) - 4} y={y(p.score) - 4} width="8" height="8" fill={AQUA}>
            <title>{`${TYPE_LABEL[p.type] ?? p.type} · ${p.score.toFixed(1)} · PASS · ${p.daysAgo}d ago`}</title>
          </rect>
        ) : (
          <g key={i} stroke={SIGNAL} strokeWidth="2">
            <line x1={x(p.daysAgo) - 4} y1={y(p.score) - 4} x2={x(p.daysAgo) + 4} y2={y(p.score) + 4} />
            <line x1={x(p.daysAgo) - 4} y1={y(p.score) + 4} x2={x(p.daysAgo) + 4} y2={y(p.score) - 4} />
            <title>{`${TYPE_LABEL[p.type] ?? p.type} · ${p.score.toFixed(1)} · FAIL · ${p.daysAgo}d ago`}</title>
          </g>
        )
      )}
      <text x={PAD_L} y={H - 6} fontSize="8" fill={TICK} fontFamily="inherit">{maxDays}d ago</text>
      <text x={W - PAD_R} y={H - 6} fontSize="8" fill={TICK} textAnchor="end" fontFamily="inherit">today</text>
    </svg>
  )
}

/* ── Recovery impact: before/after paired bars ─────────────────────────────── */
function ArcRow({ arc }: { arc: RecoveryArc }) {
  const pct = (v: number) => `${((v / 5) * 100).toFixed(0)}%`
  return (
    <div className="py-3 border-t border-gray-100 first:border-0">
      <div className="flex items-baseline justify-between mb-1.5">
        <p className="text-xs font-medium text-gray-900">
          {arc.guardName} <span className="text-gray-400">· {TYPE_LABEL[arc.type] ?? arc.type}</span>
        </p>
        <p className="text-[10px] text-gray-400">re-audited {arc.daysBetween}d later</p>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-10 text-[9px] font-semibold uppercase tracking-wide text-red-500">Fail</span>
          <div className="flex-1 h-3 bg-gray-100 rounded-full">
            <div className="h-full" style={{ width: pct(arc.before), background: SIGNAL }} />
          </div>
          <span className="w-8 text-xs font-bold text-red-500 text-right">{arc.before.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-10 text-[9px] font-semibold uppercase tracking-wide text-emerald-500">Pass</span>
          <div className="flex-1 h-3 bg-gray-100 rounded-full">
            <div className="h-full" style={{ width: pct(arc.after), background: AQUA }} />
          </div>
          <span className="w-8 text-xs font-bold text-emerald-500 text-right">{arc.after.toFixed(1)}</span>
        </div>
      </div>
    </div>
  )
}

/* ── Facility-supplied actuarial inputs ────────────────────────────────────────
   There is deliberately no default. An invented claim cost rendered as a hard
   dollar figure is the kind of number that ends up in a carrier conversation or
   a deposition, so the panel stays blank until a facility enters figures it can
   defend and attribute.                                                        */
function LiabilityModelConfig({
  model, canConfigure,
}: { model: LiabilityModel | null; canConfigure: boolean }) {
  const [open, setOpen] = useState(false)
  const [cost, setCost] = useState(model ? String(model.avg_claim_cost) : '')
  const [pct, setPct] = useState(model ? String(Math.round(model.claim_probability_reduction * 100)) : '')
  const [source, setSource] = useState(model?.source ?? '')
  const [pending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const res = await saveLiabilityModel({
        avgClaimCost: Number(cost),
        claimProbabilityReduction: Number(pct) / 100,
        source,
      })
      if (res.error) toast.error(res.error)
      else { toast.success('Liability model saved.'); setOpen(false) }
    })
  }

  function handleClear() {
    startTransition(async () => {
      const res = await clearLiabilityModel()
      if (res.error) toast.error(res.error)
      else { toast.success('Liability model cleared.'); setCost(''); setPct(''); setSource(''); setOpen(false) }
    })
  }

  if (!canConfigure) {
    return (
      <p className="mt-4 text-[10px] text-gray-400">
        {model
          ? `Model: ${fmtUsd(model.avg_claim_cost)} avg. claim × ${Math.round(model.claim_probability_reduction * 100)}% reduction${model.source ? ` · ${model.source}` : ''}`
          : 'No liability model configured for this facility.'}
      </p>
    )
  }

  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5 text-gray-400" />
            Actuarial inputs
          </p>
          <p className="text-[11px] text-gray-500 mt-1">
            {model ? (
              <>
                {fmtUsd(model.avg_claim_cost)} average defended claim ×{' '}
                {Math.round(model.claim_probability_reduction * 100)}% reduction per corrected deficiency
                {model.source && <> · <span className="text-gray-400">{model.source}</span></>}
                {model.updated_by_name && (
                  <span className="text-gray-400"> · set by {model.updated_by_name}</span>
                )}
              </>
            ) : (
              <>Get these from your carrier or broker. Until they&apos;re entered, no dollar figures are shown.</>
            )}
          </p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="shrink-0 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          {open ? 'Cancel' : model ? 'Edit' : 'Configure'}
        </button>
      </div>

      {open && (
        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-3 gap-3 items-end">
          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-widest mb-1">
              Avg. defended claim (USD)
            </label>
            <input
              type="number" min="1" value={cost} onChange={(e) => setCost(e.target.value)}
              placeholder="e.g. 85000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-widest mb-1">
              Claim-probability reduction (%)
            </label>
            <input
              type="number" min="1" max="100" value={pct} onChange={(e) => setPct(e.target.value)}
              placeholder="e.g. 35"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-gray-500 uppercase tracking-widest mb-1">
              Source
            </label>
            <input
              value={source} onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. Carrier renewal packet 2026"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="col-span-3 flex items-center justify-end gap-2">
            {model && (
              <button
                onClick={handleClear} disabled={pending}
                className="px-3 py-2 text-xs text-gray-500 hover:text-red-500 disabled:opacity-50 transition-colors"
              >
                Clear model
              </button>
            )}
            <button
              onClick={handleSave} disabled={pending}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save model
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const fmtUsd = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

export function AnalyticsClient({
  trends, guardSeries, arcs, teamBefore, teamAfter, windowDays, totalAudits,
  liabilityModel, canConfigure, incidentStats,
}: Props) {
  const [selectedGuard, setSelectedGuard] = useState(guardSeries[0]?.id ?? '')
  const guard = guardSeries.find((g) => g.id === selectedGuard) ?? guardSeries[0]

  const correctionsVerified = arcs.length
  const avgImprovement = arcs.length > 0
    ? arcs.reduce((sum, a) => sum + (a.after - a.before), 0) / arcs.length
    : 0

  // Dollars are shown ONLY from facility-supplied inputs. No default, ever.
  const projectedSaved = liabilityModel
    ? Math.round(correctionsVerified * liabilityModel.avg_claim_cost * liabilityModel.claim_probability_reduction)
    : null
  // Annualise from the real observed window rather than assuming a quarter.
  const annualized = projectedSaved !== null && windowDays > 0
    ? Math.round(projectedSaved * (365 / windowDays))
    : null

  const fmt = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  return (
    <div className="px-8 py-6 max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {totalAudits} audits over the last {windowDays} days
        </p>
      </div>

      {/* ── Performance trends (small multiples) ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Performance Trends — Weekly Average Score</h2>
        </div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {Object.entries(trends).map(([type, buckets]) => (
            <TrendPanel key={type} type={type} buckets={buckets} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-6">
        {/* ── Per-lifeguard trajectory ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Lifeguard Trajectory</h2>
            <select
              value={selectedGuard}
              onChange={(e) => setSelectedGuard(e.target.value)}
              className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg"
            >
              {guardSeries.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          {guard ? <GuardChart guard={guard} /> : <p className="text-sm text-gray-400 py-8 text-center">Not enough audit history yet.</p>}
          <div className="flex items-center gap-4 mt-2 text-[10px] text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2" style={{ background: AQUA }} /> Pass
            </span>
            <span className="flex items-center gap-1.5">
              <span className="font-bold" style={{ color: SIGNAL }}>✕</span> Fail
            </span>
            <span className="ml-auto">All audit types, chronological</span>
          </div>
        </section>

        {/* ── Recovery impact ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Recovery Impact</h2>
          <p className="text-xs text-gray-400 mb-2">
            Score on the failed audit vs. the next passing audit of the same type. Derived from
            audit history, not from verified remediation tasks.
          </p>
          {arcs.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No completed recovery arcs yet.</p>
          ) : (
            <div>{arcs.slice(0, 5).map((a, i) => <ArcRow key={i} arc={a} />)}</div>
          )}
          <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-xs">
            <span className="text-gray-500">Team pass rate, first half vs second half of window</span>
            <span>
              <span className="text-gray-400">{Math.round(teamBefore * 100)}%</span>
              <span className="text-gray-400 mx-1.5">→</span>
              <span className={`font-bold ${teamAfter >= teamBefore ? 'text-emerald-500' : 'text-red-500'}`}>
                {Math.round(teamAfter * 100)}%
              </span>
            </span>
          </div>
        </section>
      </div>

      {/* ── Incidents (real, recorded) ── */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Incidents on Record</h2>
        <p className="text-xs text-gray-400 mb-4">
          Filed incident reports for this facility. Unlike the projection below, these are counts of
          things that actually happened.
        </p>
        <div className="grid grid-cols-4 gap-4">
          {[
            { v: incidentStats.total, l: 'Total incidents' },
            { v: incidentStats.saves, l: 'Saves & rescues' },
            { v: incidentStats.severe, l: 'Severe' },
            { v: incidentStats.emsCalls, l: 'EMS called' },
          ].map((t) => (
            <div key={t.l} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-3xl font-bold text-gray-900">{t.v}</p>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2">{t.l}</p>
            </div>
          ))}
        </div>
        {incidentStats.total === 0 && (
          <p className="text-xs text-gray-400 mt-3">
            Nothing filed yet. Incidents recorded under Incidents appear here and on each
            responder&apos;s liability report.
          </p>
        )}
      </section>

      {/* ── EXPERIMENTAL: liability projection ── */}
      <section className="border-2 rounded-xl p-6" style={{ borderColor: SIGNAL, background: 'rgba(255,74,26,0.04)' }}>
        <div className="flex items-center gap-2.5 mb-1">
          <FlaskConical className="w-4 h-4" style={{ color: SIGNAL }} />
          <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: SIGNAL }}>
            Experimental — Liability Avoided
          </h2>
          <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 border" style={{ borderColor: SIGNAL, color: SIGNAL }}>
            Projection
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-5 max-w-2xl">
          Counted from this facility&apos;s own recovery arcs — a documented fail on a
          liability-critical criterion followed by a verified pass on the same criterion, over the
          last {windowDays} days.
          {liabilityModel
            ? ' Dollar figures apply the actuarial inputs your facility entered below.'
            : ' Dollar figures require actuarial inputs your facility can stand behind — see below.'}
        </p>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-3xl font-bold text-gray-900">{correctionsVerified}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2">Deficiencies corrected<br />&amp; verified (window)</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-3xl font-bold" style={{ color: AQUA }}>+{avgImprovement.toFixed(1)}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2">Avg. score gain<br />per correction</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            {projectedSaved !== null ? (
              <p className="text-3xl font-bold" style={{ color: AQUA }}>{fmt(projectedSaved)}</p>
            ) : (
              <p className="text-lg font-semibold text-gray-300">Not configured</p>
            )}
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2">Projected liability<br />avoided ({windowDays}d)</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            {annualized !== null ? (
              <p className="text-3xl font-bold" style={{ color: AQUA }}>{fmt(annualized)}</p>
            ) : (
              <p className="text-lg font-semibold text-gray-300">Not configured</p>
            )}
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2">Annualized<br />run-rate</p>
          </div>
        </div>

        <LiabilityModelConfig model={liabilityModel} canConfigure={canConfigure} />
        <div className="flex items-start gap-2 mt-4 text-[10px] text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <p>
            Each corrected deficiency is a documented fail on a liability-critical criterion followed
            by a passing re-audit of the same criterion. The audit trail behind every figure above is
            exportable from the lifeguard&apos;s liability report.
          </p>
        </div>
      </section>
    </div>
  )
}
