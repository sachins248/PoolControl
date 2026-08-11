'use client'

import { useState } from 'react'
import { FlaskConical, TrendingUp, ShieldCheck } from 'lucide-react'
import type { TrendBucket, GuardSeries, RemediationArc } from './page'

const AQUA = '#45e0ce'
const SIGNAL = '#ff4a1a'
const GRID = 'rgba(239,236,227,0.09)'
const TICK = 'rgba(239,236,227,0.4)'

const TYPE_LABEL: Record<string, string> = {
  scanning: 'Scanning', vat: 'VAT', cpr_skills: 'CPR / Skills', dispatch: 'Dispatch',
}

// Illustrative actuarial inputs for the projection panel — clearly labeled in the UI.
const AVG_CLAIM_COST = 85_000
const CLAIM_PROBABILITY_REDUCTION = 0.35

interface Props {
  trends: Record<string, TrendBucket[]>
  guardSeries: GuardSeries[]
  arcs: RemediationArc[]
  teamBefore: number
  teamAfter: number
  windowDays: number
  totalAudits: number
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

/* ── Remediation impact: before/after paired bars ──────────────────────────── */
function ArcRow({ arc }: { arc: RemediationArc }) {
  const pct = (v: number) => `${((v / 5) * 100).toFixed(0)}%`
  return (
    <div className="py-3 border-t border-gray-100 first:border-0">
      <div className="flex items-baseline justify-between mb-1.5">
        <p className="text-xs font-medium text-gray-900">
          {arc.guardName} <span className="text-gray-400">· {TYPE_LABEL[arc.type] ?? arc.type}</span>
        </p>
        <p className="text-[10px] text-gray-400">remediated → re-audited in {arc.daysBetween}d</p>
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

export function AnalyticsClient({
  trends, guardSeries, arcs, teamBefore, teamAfter, windowDays, totalAudits,
}: Props) {
  const [selectedGuard, setSelectedGuard] = useState(guardSeries[0]?.id ?? '')
  const guard = guardSeries.find((g) => g.id === selectedGuard) ?? guardSeries[0]

  const incidentsAvoided = arcs.length
  const projectedSaved = Math.round(incidentsAvoided * AVG_CLAIM_COST * CLAIM_PROBABILITY_REDUCTION)
  const quarterArcs = arcs.length // window ≈ one quarter of data
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

        {/* ── Remediation impact ── */}
        <section className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Remediation Impact</h2>
          <p className="text-xs text-gray-400 mb-2">
            Score on the failed audit vs. the re-audit after remediation.
          </p>
          {arcs.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No completed remediation arcs yet.</p>
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
          Modeled from this facility&apos;s completed fail → remediate → pass arcs. Figures use
          illustrative actuarial inputs (avg. defended aquatic claim {fmt(AVG_CLAIM_COST)}, {Math.round(CLAIM_PROBABILITY_REDUCTION * 100)}%
          claim-probability reduction per corrected deficiency) and become facility-specific once
          incident reporting and national claim-average lookup are integrated.
        </p>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-3xl font-bold text-gray-900">{incidentsAvoided}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2">Deficiencies corrected<br />&amp; verified (window)</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-3xl font-bold" style={{ color: AQUA }}>{fmt(projectedSaved)}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2">Projected liability<br />avoided (quarter)</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-3xl font-bold" style={{ color: AQUA }}>{fmt(projectedSaved * 4)}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2">Annualized<br />run-rate</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-3xl font-bold text-gray-900">{quarterArcs}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-2">Potential incidents<br />averted (modeled)</p>
          </div>
        </div>
        <div className="flex items-start gap-2 mt-4 text-[10px] text-gray-400">
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <p>
            Each corrected deficiency is a documented fail on a liability-critical criterion that was
            remediated and re-verified through the PoolControl workflow — the audit trail behind every
            figure above is exportable from the lifeguard&apos;s liability report.
          </p>
        </div>
      </section>
    </div>
  )
}
