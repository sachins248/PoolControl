import { requireUser, isManager } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, CheckCircle, XCircle, Clock, FileText, Zap } from 'lucide-react'
import { LifeguardAvatar } from '@/components/shared/lifeguard-avatar'
import { AuditLogDownload } from './audit-log-download'
import { CadenceEditor } from './cadence-editor'
import { getEffectiveCadence } from '@/lib/schedule'
import type { Audit, AuditTypeName, RemediationTask } from '@/types'

const CORE_TYPES: AuditTypeName[] = ['scanning', 'vat', 'cpr_skills', 'dispatch']

function computeLPR(audits: Audit[]): number {
  const completed = audits.filter((a) => a.passed !== null)
  if (completed.length === 0) return 0
  const passRate = completed.filter((a) => a.passed).length / completed.length
  return Math.round((1 + passRate * 4) * 10) / 10
}

const AUDIT_DISPLAY: Record<string, string> = {
  scanning: 'Scanning', vat: 'VAT', cpr_skills: 'CPR / Skills',
  dispatch: 'Dispatch', supervisor_eavs: 'EAVS', guest_service: 'Guest Service', cleaning: 'Cleaning',
}

const STATUS_LABELS: Record<string, string> = {
  assigned: 'Assigned', acknowledged: 'Acknowledged', in_deck: 'In Deck',
  verified: 'Verified', escalated: 'Escalated',
}

export default async function RosterMemberPage({ params }: { params: { id: string } }) {
  const profile = await requireUser()
  if (profile.role === 'lifeguard') redirect('/my-profile')
  if (!profile.facility_id) return null

  const supabase = createClient()

  const { data: member } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', params.id)
    .eq('facility_id', profile.facility_id)
    .single()

  if (!member) notFound()

  const [{ data: audits }, { data: remediations }, { data: facility }] = await Promise.all([
    supabase
      .from('audits')
      .select('*')
      .eq('lifeguard_id', params.id)
      .in('status', ['completed', 'remediated', 'closed'])
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false }),
    supabase
      .from('remediation_tasks')
      .select('*')
      .eq('lifeguard_id', params.id)
      .order('deadline', { ascending: true }),
    supabase
      .from('facilities')
      .select('config')
      .eq('id', profile.facility_id)
      .single(),
  ])

  const facilityCadence = (facility?.config?.audit_cadence ?? {}) as Record<AuditTypeName, number>

  // Per-type performance + schedule (audits are already newest-first)
  const typeCards = CORE_TYPES.map((type) => {
    const typeAudits = ((audits ?? []) as Audit[]).filter(
      (a) => a.audit_type_name === type && a.passed !== null,
    )
    const latest = typeAudits[0] ?? null
    const avgScore = typeAudits.length > 0
      ? typeAudits.reduce((s, a) => s + (a.score ?? 0), 0) / typeAudits.length
      : null
    const passRate = typeAudits.length > 0
      ? typeAudits.filter((a) => a.passed).length / typeAudits.length
      : null

    const cadence = getEffectiveCadence(
      type,
      facilityCadence,
      member.audit_cadence_override,
      latest != null && latest.passed === false,
    )

    let daysAgo: number | null = null
    let dueInDays: number | null = null
    if (latest?.submitted_at) {
      daysAgo = Math.floor((Date.now() - new Date(latest.submitted_at).getTime()) / 86400000)
      dueInDays = cadence.days - daysAgo
    }

    return { type, count: typeAudits.length, avgScore, passRate, latest, cadence, daysAgo, dueInDays }
  })

  const lpr = computeLPR((audits ?? []) as Audit[])
  const openRem = (remediations ?? []).filter((r) => ['assigned', 'acknowledged', 'in_deck'].includes(r.status))
  const lprColor = lpr === 0 ? 'text-gray-400' : lpr >= 4 ? 'text-emerald-600' : lpr >= 3 ? 'text-amber-500' : 'text-red-500'
  const lprBg = lpr === 0 ? 'bg-gray-50 border-gray-200' : lpr >= 4 ? 'bg-emerald-50 border-emerald-200' : lpr >= 3 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'

  return (
    <div className="px-8 py-6 max-w-4xl space-y-6">
      {/* Back */}
      <Link href="/roster" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Roster
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <LifeguardAvatar name={member.name} avatarColor={member.avatar_color} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{member.name}</h1>
            <p className="text-gray-500 text-sm capitalize">{member.role} · {member.email}</p>
            {member.hire_date && (
              <p className="text-gray-400 text-xs mt-0.5">
                Hired {new Date(member.hire_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lpr > 0 && (
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${lprBg}`}>
              <span className={`text-2xl font-bold ${lprColor}`}>{lpr.toFixed(1)}</span>
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide ${lprColor}`}>LPR Score</p>
                <p className="text-xs text-gray-400">out of 5.0</p>
              </div>
            </div>
          )}
          <AuditLogDownload memberName={member.name} audits={(audits ?? []) as Audit[]} />
          {isManager(profile.role) && (
            <Link
              href={`/roster/${member.id}/report`}
              className="flex items-center gap-2 px-4 py-2 border border-white/[0.10] text-white/70 hover:text-white hover:border-white/[0.20] text-sm font-medium rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" /> Generate Report
            </Link>
          )}
          {member.role === 'lifeguard' && (
            <Link
              href={`/audits/new?lifeguardId=${member.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" /> Start Audit
            </Link>
          )}
        </div>
      </div>

      {/* Per-type performance */}
      {member.role === 'lifeguard' && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Performance by Audit Type
          </h2>
          <div className="grid grid-cols-4 gap-3">
            {typeCards.map((c) => {
              const scoreColor = c.avgScore === null ? 'text-gray-400'
                : c.avgScore >= 4 ? 'text-emerald-600'
                : c.avgScore >= 3 ? 'text-amber-500' : 'text-red-500'
              return (
                <div key={c.type} className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    {AUDIT_DISPLAY[c.type]}
                  </p>
                  <p className={`text-2xl font-bold mt-2 ${scoreColor}`}>
                    {c.avgScore !== null ? c.avgScore.toFixed(1) : '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {c.count > 0
                      ? `${Math.round((c.passRate ?? 0) * 100)}% pass · ${c.count} audit${c.count !== 1 ? 's' : ''}`
                      : 'No audits yet'}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Audit schedule */}
      {member.role === 'lifeguard' && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
              Audit Schedule
            </h2>
            {isManager(profile.role) && (
              <CadenceEditor
                lifeguardId={member.id}
                facilityCadence={facilityCadence}
                override={member.audit_cadence_override ?? null}
              />
            )}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {typeCards.map((c, i) => {
              const overdue = c.dueInDays !== null ? c.dueInDays < 0 : c.count === 0
              const dueSoon = c.dueInDays !== null && c.dueInDays >= 0 && c.dueInDays <= 1
              const statusLabel = c.count === 0 && c.daysAgo === null
                ? 'NEVER AUDITED — DUE NOW'
                : overdue ? `OVERDUE BY ${Math.abs(c.dueInDays!)}D`
                : dueSoon ? 'DUE TODAY'
                : `DUE IN ${c.dueInDays}D`
              const statusColor = overdue ? 'text-red-500' : dueSoon ? 'text-amber-500' : 'text-gray-400'
              return (
                <div key={c.type} className={`flex items-center gap-4 px-5 py-3 ${i > 0 ? 'border-t border-gray-100' : ''}`}>
                  <span className="w-28 text-sm font-medium text-gray-900">{AUDIT_DISPLAY[c.type]}</span>
                  <span className="text-xs text-gray-500">
                    every <b className="text-gray-700">{c.cadence.days}d</b>
                    {c.cadence.source === 'override' && (
                      <span className="ml-1.5 text-[10px] font-semibold text-blue-600 uppercase">custom</span>
                    )}
                    {c.cadence.adaptive && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 uppercase">
                        <Zap className="w-2.5 h-2.5" /> tightened after fail (base {c.cadence.base}d)
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {c.daysAgo !== null ? `last audited ${c.daysAgo}d ago` : 'no history'}
                  </span>
                  <span className={`text-xs font-bold w-40 text-right ${statusColor}`}>{statusLabel}</span>
                  <Link
                    href={`/audits/new?lifeguardId=${member.id}&auditType=${c.type}`}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Audit now →
                  </Link>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Frequency adapts automatically: a failed audit halves the interval for that type until the lifeguard passes again.
          </p>
        </section>
      )}

      {/* Open Remediations */}
      {openRem.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Open Remediations ({openRem.length})
          </h2>
          <div className="space-y-2">
            {openRem.map((task: RemediationTask) => {
              const deadline = new Date(task.deadline)
              const diff = deadline.getTime() - Date.now()
              const hours = Math.floor(diff / 3600000)
              const isOverdue = diff < 0
              return (
                <div key={task.id} className={`rounded-xl border px-5 py-4 flex items-center justify-between ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{STATUS_LABELS[task.status]}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Deadline: {deadline.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold ${isOverdue ? 'text-red-600' : hours < 24 ? 'text-amber-600' : 'text-gray-500'}`}>
                    {isOverdue ? 'OVERDUE' : hours < 24 ? `${hours}h left` : `${Math.floor(hours / 24)}d left`}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Audit History */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Audit History ({(audits ?? []).length})
        </h2>
        {(audits ?? []).length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No audits on record yet.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Zone</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Score</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Result</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {(audits ?? []).map((audit: Audit, i: number) => (
                  <tr key={audit.id} className={`border-b border-gray-50 last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                    <td className="px-5 py-3 font-medium text-gray-900">{AUDIT_DISPLAY[audit.audit_type_name] ?? audit.audit_type_name}</td>
                    <td className="px-5 py-3 text-gray-500">{audit.zone ?? '—'}</td>
                    <td className="px-5 py-3 text-center text-gray-700">{audit.score !== null ? `${Math.round(audit.score * 100)}%` : '—'}</td>
                    <td className="px-5 py-3 text-center">
                      {audit.passed === true ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium"><CheckCircle className="w-3.5 h-3.5" /> Pass</span>
                      ) : audit.passed === false ? (
                        <span className="inline-flex items-center gap-1 text-red-500 text-xs font-medium"><XCircle className="w-3.5 h-3.5" /> Fail</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400 text-xs"><Clock className="w-3.5 h-3.5" /> Pending</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {audit.submitted_at ? new Date(audit.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={`/audits/result/${audit.id}`} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
