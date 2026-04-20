import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getDailySchedule, AUDIT_TYPES, AUDIT_DISPLAY } from '@/lib/schedule'
import { ScheduleCellComponent } from '@/components/schedule/cell'
import { LifeguardAvatar } from '@/components/shared/lifeguard-avatar'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import type { Priority } from '@/types'

const PRIORITY_STYLES: Record<Priority, string> = {
  HIGH: 'text-red-600 font-bold',
  MED: 'text-amber-500 font-semibold',
  'ON TRACK': 'text-emerald-600 font-medium',
}

export default async function SchedulePage() {
  const profile = await requireUser()

  // Lifeguards don't have access to the schedule — redirect to their own profile
  if (profile.role === 'lifeguard') {
    const { redirect } = await import('next/navigation')
    redirect('/my-profile')
  }

  const supabase = createClient()

  if (!profile.facility_id) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">No facility assigned. Contact your director.</p>
      </div>
    )
  }

  const schedule = await getDailySchedule(profile.facility_id, supabase)
  const completedPct = schedule.total > 0 ? Math.round((schedule.done / schedule.total) * 100) : 0

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="bg-[#0f1e2e] text-white px-8 py-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold">Daily Audit Schedule</h1>
            <p className="text-white/50 text-sm mt-0.5">
              Auto-generated from audit history · {schedule.facility.name}
            </p>
          </div>

          {/* Stat chips */}
          <div className="flex items-center gap-4 text-right">
            <div>
              <div className="text-2xl font-bold text-white">{schedule.on_shift}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wide">On Shift</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400">{schedule.due_today}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wide">Due Today</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400">{schedule.overdue}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wide">Overdue</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-400">{schedule.done}</div>
              <div className="text-[10px] text-white/40 uppercase tracking-wide">Done</div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-white/70">Today&apos;s Progress</span>
            <div className="flex items-center gap-4 text-xs text-white/50">
              <span className="text-white/70 font-medium">{schedule.done} of {schedule.total} audits completed</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block"/>Overdue</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>Due Today</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block"/>On Track</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/>Completed</span>
            </div>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all"
              style={{ width: `${completedPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {schedule.rows.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg font-medium">No lifeguards on roster yet.</p>
            <p className="text-sm mt-1">Add lifeguards in Settings → Roster.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-0 border-b border-gray-100">
              <div className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Lifeguard
              </div>
              {AUDIT_TYPES.map((type) => (
                <div key={type} className="px-3 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">
                  {AUDIT_DISPLAY[type]}
                </div>
              ))}
              <div className="px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">
                Priority
              </div>
            </div>

            {/* Table rows */}
            {schedule.rows.map((row, i) => (
              <div
                key={row.lifeguard.id}
                className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-0 border-b border-gray-50 last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-50/50'}`}
              >
                <div className="px-5 py-3 flex items-center gap-3">
                  <LifeguardAvatar
                    name={row.lifeguard.name}
                    avatarColor={row.lifeguard.avatar_color}
                    size="sm"
                  />
                  <Link
                    href={`/roster/${row.lifeguard.id}`}
                    className="text-sm font-medium text-gray-900 hover:text-emerald-600 transition-colors"
                  >
                    {row.lifeguard.name}
                  </Link>
                </div>

                {AUDIT_TYPES.map((type) => (
                  <div key={type} className="px-2 py-3 flex items-center">
                    <ScheduleCellComponent
                      cell={row.cells[type]}
                      lifeguardId={row.lifeguard.id}
                      auditType={type}
                    />
                  </div>
                ))}

                <div className="px-5 py-3 flex items-center justify-center">
                  <span className={`text-xs font-bold tracking-wide ${PRIORITY_STYLES[row.priority]}`}>
                    {row.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <Link
            href="/audits/new"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Audit
          </Link>
        </div>
      </div>
    </div>
  )
}
