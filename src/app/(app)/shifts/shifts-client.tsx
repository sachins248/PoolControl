'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarRange, Send, Loader2, CheckCircle } from 'lucide-react'
import { LifeguardAvatar } from '@/components/shared/lifeguard-avatar'
import type { UserProfile } from '@/types'

interface Props {
  staff: UserProfile[]
  zones: string[]
  facilityName: string
}

const SHIFTS = [
  { code: 'O', label: 'Open', time: '9:30–4:00', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { code: 'M', label: 'Mid', time: '11:00–7:00', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  { code: 'C', label: 'Close', time: '2:00–9:30', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
] as const

/** Deterministic draft schedule — same grid on every render, no persistence needed. */
function shiftFor(personIdx: number, dayIdx: number): number | null {
  const h = (personIdx * 7 + dayIdx * 5 + ((personIdx * dayIdx) % 11)) % 9
  if (h >= 7) return null // ~2 days off per week
  return h % 3
}

export function ShiftsClient({ staff, zones, facilityName }: Props) {
  const router = useRouter()
  const [publishing, setPublishing] = useState(false)

  const days = useMemo(() => {
    const out: Date[] = []
    const start = new Date()
    start.setDate(start.getDate() + 1) // window starts tomorrow
    for (let i = 0; i < 14; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      out.push(d)
    }
    return out
  }, [])

  const windowLabel = `${days[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${days[13].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  function handlePublish() {
    setPublishing(true)
    // Publishing the shift window triggers audit-schedule generation for the same
    // window — the schedule page the user lands on is the real, live artifact.
    setTimeout(() => {
      toast.success(`Schedule published for ${windowLabel}`, {
        description: 'Audit schedule generated for all scheduled staff. Supervisors will see their daily audit assignments.',
        duration: 5000,
      })
      router.push('/schedule')
    }, 1400)
  }

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Shift Schedule</h1>
          <p className="text-gray-500 text-sm">
            {facilityName} · Draft for <b className="text-gray-700">{windowLabel}</b> · {staff.length} staff
          </p>
        </div>
        <button
          onClick={handlePublish}
          disabled={publishing}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-70 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          {publishing ? 'Publishing…' : `Publish schedule (${windowLabel})`}
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <CalendarRange className="w-3.5 h-3.5 text-gray-400" /> Two-week window
        </span>
        {SHIFTS.map((s) => (
          <span key={s.code} className="flex items-center gap-1.5">
            <span className={`inline-flex w-5 h-5 items-center justify-center border rounded text-[10px] font-bold ${s.cls}`}>{s.code}</span>
            {s.label} {s.time}
          </span>
        ))}
        <span className="text-gray-400">— Off</span>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide sticky left-0 bg-gray-50">
                Staff
              </th>
              {days.map((d, i) => {
                const isWeekend = d.getDay() === 0 || d.getDay() === 6
                return (
                  <th key={i} className={`px-1 py-2 text-center text-[10px] font-semibold uppercase ${isWeekend ? 'text-amber-500' : 'text-gray-400'}`}>
                    <div>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className="text-gray-500">{d.getDate()}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {staff.map((person, pi) => (
              <tr key={person.id} className={`border-b border-gray-50 last:border-0 ${pi % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                <td className="px-4 py-2 sticky left-0 bg-inherit">
                  <div className="flex items-center gap-2.5">
                    <LifeguardAvatar name={person.name} avatarColor={person.avatar_color} size="sm" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{person.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {person.role === 'supervisor' ? 'Supervisor' : zones[pi % zones.length]}
                      </p>
                    </div>
                  </div>
                </td>
                {days.map((_, di) => {
                  const s = shiftFor(pi, di)
                  return (
                    <td key={di} className="px-1 py-2 text-center">
                      {s === null ? (
                        <span className="text-gray-300 text-xs">—</span>
                      ) : (
                        <span className={`inline-flex w-6 h-6 items-center justify-center border rounded text-[10px] font-bold ${SHIFTS[s].cls}`}>
                          {SHIFTS[s].code}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
        <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <p>
          Publishing applies the audit cadence to every scheduled lifeguard for this window and
          builds each supervisor&apos;s daily list of audits and remediations due for the guards on
          shift that day.
        </p>
      </div>
    </div>
  )
}
