import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { LifeguardAvatar } from '@/components/shared/lifeguard-avatar'
import type { UserProfile, Audit } from '@/types'

function computeLPR(audits: Audit[]): number | null {
  const completed = audits.filter((a) => a.passed !== null)
  if (completed.length === 0) return null
  const passRate = completed.filter((a) => a.passed).length / completed.length
  return Math.round((1 + passRate * 4) * 10) / 10
}

const ROLE_LABELS: Record<string, string> = {
  lifeguard: 'Lifeguard',
  supervisor: 'Supervisor',
  director: 'Director',
}

const LPR_COLOR = (lpr: number | null) => {
  if (lpr === null) return 'text-gray-400'
  if (lpr >= 4.0) return 'text-emerald-600'
  if (lpr >= 3.0) return 'text-amber-500'
  return 'text-red-500'
}

export default async function RosterPage() {
  const profile = await requireUser()
  if (profile.role === 'lifeguard') redirect('/my-profile')
  if (!profile.facility_id) return null

  const supabase = createClient()

  const { data: staff } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('facility_id', profile.facility_id)
    .order('name')

  // Fetch recent audits for all staff to compute LPR
  const staffIds = (staff ?? []).map((s) => s.id)
  const { data: audits } = await supabase
    .from('audits')
    .select('lifeguard_id, passed, submitted_at')
    .in('lifeguard_id', staffIds)
    .in('status', ['completed', 'remediated', 'closed'])
    .not('submitted_at', 'is', null)

  // Open remediations count per lifeguard
  const { data: remediations } = await supabase
    .from('remediation_tasks')
    .select('lifeguard_id, status')
    .eq('facility_id', profile.facility_id)
    .in('status', ['assigned', 'acknowledged', 'in_deck'])

  const auditsByGuard: Record<string, Audit[]> = {}
  for (const a of audits ?? []) {
    if (!auditsByGuard[a.lifeguard_id]) auditsByGuard[a.lifeguard_id] = []
    auditsByGuard[a.lifeguard_id].push(a as any)
  }

  const remByGuard: Record<string, number> = {}
  for (const r of remediations ?? []) {
    remByGuard[r.lifeguard_id] = (remByGuard[r.lifeguard_id] ?? 0) + 1
  }

  const lifeguards = (staff ?? []).filter((s) => s.role === 'lifeguard') as UserProfile[]
  const supervisors = (staff ?? []).filter((s) => s.role !== 'lifeguard') as UserProfile[]

  function StaffTable({ members, showAudit }: { members: UserProfile[]; showAudit: boolean }) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Name</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Role</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Hire Date</th>
              {showAudit && <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">LPR</th>}
              {showAudit && <th className="text-center px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Open Issues</th>}
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {members.map((member, i) => {
              const lpr = computeLPR(auditsByGuard[member.id] ?? [])
              const openRem = remByGuard[member.id] ?? 0
              return (
                <tr key={member.id} className={`border-b border-gray-50 last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <LifeguardAvatar name={member.name} avatarColor={member.avatar_color} size="sm" />
                      <Link href={`/roster/${member.id}`} className="font-medium text-gray-900 hover:text-emerald-600 transition-colors">
                        {member.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{ROLE_LABELS[member.role] ?? member.role}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {member.hire_date ? new Date(member.hire_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                  {showAudit && (
                    <td className="px-5 py-3 text-center">
                      <span className={`font-bold ${LPR_COLOR(lpr)}`}>
                        {lpr !== null ? lpr.toFixed(1) : '—'}
                      </span>
                    </td>
                  )}
                  {showAudit && (
                    <td className="px-5 py-3 text-center">
                      {openRem > 0 ? (
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-100 text-red-600 text-xs font-bold">{openRem}</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-5 py-3 text-right">
                    {showAudit && (
                      <Link
                        href={`/audits/new?lifeguardId=${member.id}`}
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                      >
                        + Audit
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="px-8 py-6 max-w-5xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Roster</h1>
          <p className="text-gray-500 text-sm mt-0.5">{(staff ?? []).length} staff members</p>
        </div>
        <Link
          href="/audits/new"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" /> New Audit
        </Link>
      </div>

      {lifeguards.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Lifeguards ({lifeguards.length})
          </h2>
          <StaffTable members={lifeguards} showAudit={true} />
        </section>
      )}

      {supervisors.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Supervisors & Directors ({supervisors.length})
          </h2>
          <StaffTable members={supervisors} showAudit={false} />
        </section>
      )}
    </div>
  )
}
