import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react'
import { LifeguardAvatar } from '@/components/shared/lifeguard-avatar'

const AUDIT_DISPLAY: Record<string, string> = {
  scanning: 'Scanning', vat: 'VAT', cpr_skills: 'CPR / Skills',
  dispatch: 'Dispatch', supervisor_eavs: 'EAVS', guest_service: 'Guest Service', cleaning: 'Cleaning',
}

function passRateColor(rate: number) {
  if (rate >= 0.85) return 'text-emerald-600'
  if (rate >= 0.70) return 'text-amber-500'
  return 'text-red-500'
}

function passRateBar(rate: number) {
  if (rate >= 0.85) return 'bg-emerald-400'
  if (rate >= 0.70) return 'bg-amber-400'
  return 'bg-red-400'
}

export default async function TeamPage() {
  const profile = await requireUser()
  if (profile.role === 'lifeguard') redirect('/my-profile')
  if (!profile.facility_id) return null

  const supabase = createClient()

  const [{ data: audits }, { data: lifeguards }, { data: criteria }] = await Promise.all([
    supabase
      .from('audits')
      .select('id, lifeguard_id, audit_type_name, score, passed, submitted_at')
      .eq('facility_id', profile.facility_id)
      .in('status', ['completed', 'remediated', 'closed'])
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false }),
    supabase
      .from('user_profiles')
      .select('id, name, avatar_color')
      .eq('facility_id', profile.facility_id)
      .eq('role', 'lifeguard')
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('audit_criteria_results')
      .select('criterion_label, result, audit_id')
      .in('audit_id',
        (await supabase
          .from('audits')
          .select('id')
          .eq('facility_id', profile.facility_id)
          .in('status', ['completed', 'remediated', 'closed'])
        ).data?.map((a) => a.id) ?? []
      ),
  ])

  const allAudits = audits ?? []
  const allLifeguards = lifeguards ?? [] // already filtered to is_active = true

  // Restrict all stats to audits from currently active lifeguards only
  const activeGuardIds = new Set(allLifeguards.map((g) => g.id))
  const activeAudits = allAudits.filter((a) => activeGuardIds.has(a.lifeguard_id))
  const activeAuditIds = new Set(activeAudits.map((a) => a.id))
  const activeCriteria = (criteria ?? []).filter((c) => activeAuditIds.has(c.audit_id))

  // ── Pass rate by audit type ──────────────────────────────────────────────────
  const byType: Record<string, { pass: number; total: number }> = {}
  for (const a of activeAudits) {
    if (a.passed === null) continue
    if (!byType[a.audit_type_name]) byType[a.audit_type_name] = { pass: 0, total: 0 }
    byType[a.audit_type_name].total++
    if (a.passed) byType[a.audit_type_name].pass++
  }

  const typeStats = Object.entries(byType)
    .map(([type, { pass, total }]) => ({ type, pass, total, rate: pass / total }))
    .sort((a, b) => a.rate - b.rate)

  // ── LPR per lifeguard ───────────────────────────────────────────────────────
  const auditsByGuard: Record<string, typeof activeAudits> = {}
  for (const a of activeAudits) {
    if (!auditsByGuard[a.lifeguard_id]) auditsByGuard[a.lifeguard_id] = []
    auditsByGuard[a.lifeguard_id].push(a)
  }

  const guardStats = allLifeguards.map((g) => {
    const ga = auditsByGuard[g.id] ?? []
    const completed = ga.filter((a) => a.passed !== null)
    const passRate = completed.length > 0 ? completed.filter((a) => a.passed).length / completed.length : null
    const lpr = passRate !== null ? Math.round((1 + passRate * 4) * 10) / 10 : null
    // 30-day trend
    const cutoff30 = new Date(Date.now() - 30 * 24 * 3600000).toISOString()
    const recent = completed.filter((a) => a.submitted_at! >= cutoff30)
    const older = completed.filter((a) => a.submitted_at! < cutoff30)
    const recentRate = recent.length > 0 ? recent.filter((a) => a.passed).length / recent.length : null
    const olderRate = older.length > 0 ? older.filter((a) => a.passed).length / older.length : null
    const trend = recentRate !== null && olderRate !== null ? recentRate - olderRate : null
    return { ...g, lpr, trend, auditCount: completed.length }
  }).sort((a, b) => (a.lpr ?? 99) - (b.lpr ?? 99))

  // ── Most common failures ─────────────────────────────────────────────────────
  const failCounts: Record<string, number> = {}
  for (const c of activeCriteria) {
    if (c.result === 'fail' || c.result === 'needs_attention') {
      failCounts[c.criterion_label] = (failCounts[c.criterion_label] ?? 0) + 1
    }
  }
  const topFailures = Object.entries(failCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const totalAudits = activeAudits.filter((a) => a.passed !== null).length
  const overallPassRate = totalAudits > 0
    ? activeAudits.filter((a) => a.passed).length / totalAudits
    : null

  return (
    <div className="px-8 py-6 max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team Analysis</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {totalAudits} audits · {allLifeguards.length} lifeguards
          {overallPassRate !== null && (
            <> · <span className={`font-medium ${passRateColor(overallPassRate)}`}>{Math.round(overallPassRate * 100)}% overall pass rate</span></>
          )}
        </p>
      </div>

      {totalAudits === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-6 py-16 text-center">
          <CheckCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-600">No audit data yet</p>
          <p className="text-sm text-gray-400 mt-1">Start conducting audits to see team analytics.</p>
          <Link href="/audits/new" className="inline-flex mt-4 px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-400 transition-colors">
            Start First Audit
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">

          {/* Pass rate by audit type */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Pass Rate by Audit Type</h2>
            {typeStats.length === 0 ? (
              <p className="text-gray-400 text-sm">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {typeStats.map(({ type, pass, total, rate }) => (
                  <div key={type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">{AUDIT_DISPLAY[type] ?? type}</span>
                      <span className={`text-sm font-semibold ${passRateColor(rate)}`}>
                        {Math.round(rate * 100)}% <span className="text-gray-400 font-normal text-xs">({pass}/{total})</span>
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${passRateBar(rate)}`} style={{ width: `${rate * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top failures */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Most Common Failures</h2>
            {topFailures.length === 0 ? (
              <div className="text-center py-6">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No failures recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {topFailures.map(([label, count], i) => (
                  <div key={label} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 truncate">{label}</p>
                    </div>
                    <span className="text-xs font-semibold text-red-500 shrink-0">{count}×</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lifeguard LPR ranking */}
          <div className="col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Lifeguard Performance Ranking</h2>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> ≥4.0</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> 3.0–3.9</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> &lt;3.0</span>
              </div>
            </div>
            {allLifeguards.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No lifeguards on roster yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {guardStats.map((guard) => {
                  const lprColor = guard.lpr === null ? 'text-gray-400' : guard.lpr >= 4 ? 'text-emerald-600' : guard.lpr >= 3 ? 'text-amber-500' : 'text-red-500'
                  const dotColor = guard.lpr === null ? 'bg-gray-200' : guard.lpr >= 4 ? 'bg-emerald-400' : guard.lpr >= 3 ? 'bg-amber-400' : 'bg-red-400'
                  return (
                    <Link
                      key={guard.id}
                      href={`/roster/${guard.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all"
                    >
                      <div className="relative">
                        <LifeguardAvatar name={guard.name} avatarColor={guard.avatar_color} size="sm" />
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${dotColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{guard.name}</p>
                        <p className="text-xs text-gray-400">{guard.auditCount} audit{guard.auditCount !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-base font-bold ${lprColor}`}>
                          {guard.lpr !== null ? guard.lpr.toFixed(1) : '—'}
                        </p>
                        {guard.trend !== null && (
                          <div className={`flex items-center gap-0.5 justify-end text-[10px] ${guard.trend > 0 ? 'text-emerald-500' : guard.trend < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                            {guard.trend > 0.01 ? <TrendingUp className="w-3 h-3" /> : guard.trend < -0.01 ? <TrendingDown className="w-3 h-3" /> : null}
                            {Math.abs(guard.trend) > 0.01 ? `${guard.trend > 0 ? '+' : ''}${Math.round(guard.trend * 100)}%` : '—'}
                          </div>
                        )}
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Needs attention callout */}
      {guardStats.filter((g) => g.lpr !== null && g.lpr < 3.0).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-800">Needs Immediate Attention</p>
            <p className="text-xs text-red-600 mt-0.5">
              {guardStats.filter((g) => g.lpr !== null && g.lpr < 3.0).map((g) => g.name).join(', ')} — LPR below 3.0. Consider scheduling remediation or additional training.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
