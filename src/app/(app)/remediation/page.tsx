import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { LifeguardAvatar } from '@/components/shared/lifeguard-avatar'
import { RemediationActions } from './remediation-actions'

const STATUS_STYLES: Record<string, string> = {
  assigned: 'bg-red-100 text-red-700',
  acknowledged: 'bg-amber-100 text-amber-700',
  in_deck: 'bg-blue-100 text-blue-700',
  verified: 'bg-emerald-100 text-emerald-700',
  escalated: 'bg-purple-100 text-purple-700',
}

const STATUS_LABELS: Record<string, string> = {
  assigned: 'Assigned', acknowledged: 'Acknowledged', in_deck: 'In Deck',
  verified: 'Verified', escalated: 'Escalated',
}

export default async function RemediationPage() {
  const profile = await requireUser()
  if (profile.role === 'lifeguard') redirect('/my-profile')
  if (!profile.facility_id) return null

  const supabase = createClient()

  const { data: tasks } = await supabase
    .from('remediation_tasks')
    .select(`
      *,
      user_profiles!lifeguard_id(id, name, avatar_color, email)
    `)
    .eq('facility_id', profile.facility_id)
    .order('deadline', { ascending: true })

  const open = (tasks ?? []).filter((t) => ['assigned', 'acknowledged', 'in_deck'].includes(t.status))
  const closed = (tasks ?? []).filter((t) => ['verified', 'escalated'].includes(t.status))

  function DeadlineTag({ deadline, status }: { deadline: string; status: string }) {
    if (['verified', 'escalated'].includes(status)) return null
    const diff = new Date(deadline).getTime() - Date.now()
    const hours = Math.floor(diff / 3600000)
    if (diff < 0) return <span className="text-xs font-bold text-red-600">OVERDUE</span>
    if (hours < 6) return <span className="text-xs font-bold text-red-500">{hours}h left</span>
    if (hours < 24) return <span className="text-xs font-semibold text-amber-500">{hours}h left</span>
    return <span className="text-xs text-gray-400">{Math.floor(hours / 24)}d left</span>
  }

  function TaskRow({ task }: { task: any }) {
    const guard = task.user_profiles
    const isClosed = ['verified', 'escalated'].includes(task.status)
    return (
      <tr className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
        <td className="px-5 py-4">
          <div className="flex items-center gap-3">
            <LifeguardAvatar name={guard?.name ?? '?'} avatarColor={guard?.avatar_color} size="sm" />
            <div>
              <Link href={`/roster/${guard?.id}`} className="text-sm font-medium text-gray-900 hover:text-emerald-600 transition-colors">
                {guard?.name ?? 'Unknown'}
              </Link>
              <p className="text-xs text-gray-400">{guard?.email}</p>
            </div>
          </div>
        </td>
        <td className="px-5 py-4">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[task.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABELS[task.status] ?? task.status}
          </span>
        </td>
        <td className="px-5 py-4 text-xs text-gray-500">
          {new Date(task.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
        </td>
        <td className="px-5 py-4">
          <DeadlineTag deadline={task.deadline} status={task.status} />
        </td>
        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            <Link href={`/audits/result/${task.audit_id}`} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">
              View Audit
            </Link>
            {!isClosed && <RemediationActions taskId={task.id} currentStatus={task.status} />}
          </div>
        </td>
      </tr>
    )
  }

  return (
    <div className="px-8 py-6 max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Remediation</h1>
        <p className="text-gray-500 text-sm mt-0.5">{open.length} open · {closed.length} closed</p>
      </div>

      {open.length === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-6 py-10 text-center">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="font-semibold text-gray-800">No open remediations</p>
          <p className="text-sm text-gray-500 mt-1">All lifeguards are clear.</p>
        </div>
      )}

      {open.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Open ({open.length})</h2>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Lifeguard</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Deadline</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Time</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {open.map((task) => <TaskRow key={task.id} task={task} />)}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {closed.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Closed ({closed.length})</h2>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm opacity-70">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Lifeguard</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Deadline</th>
                  <th className="px-5 py-3" /><th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {closed.map((task) => <TaskRow key={task.id} task={task} />)}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
