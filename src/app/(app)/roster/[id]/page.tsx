import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, CheckCircle, XCircle, Clock } from 'lucide-react'
import { LifeguardAvatar } from '@/components/shared/lifeguard-avatar'
import type { Audit, RemediationTask } from '@/types'

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

  const [{ data: audits }, { data: remediations }] = await Promise.all([
    supabase
      .from('audits')
      .select('*')
      .eq('lifeguard_id', params.id)
      .in('status', ['completed', 'remediated', 'closed'])
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(30),
    supabase
      .from('remediation_tasks')
      .select('*')
      .eq('lifeguard_id', params.id)
      .order('deadline', { ascending: true }),
  ])

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
