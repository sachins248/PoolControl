'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarRange, ChevronLeft, ChevronRight, Send, Loader2, Upload } from 'lucide-react'
import { LifeguardAvatar } from '@/components/shared/lifeguard-avatar'
import { setShiftAssignment, publishSchedule, copyPreviousWeek } from './actions'
import { ScheduleImportModal } from './schedule-import-modal'
import type { UserProfile, ShiftAssignment, ShiftType } from '@/types'

interface Props {
  staff: UserProfile[]
  shiftTypes: ShiftType[]
  assignments: ShiftAssignment[]
  startDate: string
  facilityName: string
}

const COLOR_CLASSES: Record<ShiftType['color'], string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return fmt(d)
}

function key(lifeguardId: string, date: string) {
  return `${lifeguardId}|${date}`
}

export function ShiftsClient({ staff, shiftTypes, assignments, startDate, facilityName }: Props) {
  const router = useRouter()
  const [publishing, startPublishTransition] = useTransition()
  const [copying, startCopyTransition] = useTransition()
  const [showImport, setShowImport] = useState(false)
  const [openCell, setOpenCell] = useState<{ lifeguardId: string; date: string } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const [byKey, setByKey] = useState<Record<string, ShiftAssignment>>(() => {
    const map: Record<string, ShiftAssignment> = {}
    for (const a of assignments) map[key(a.lifeguard_id, a.work_date)] = a
    return map
  })

  useEffect(() => {
    const map: Record<string, ShiftAssignment> = {}
    for (const a of assignments) map[key(a.lifeguard_id, a.work_date)] = a
    setByKey(map)
  }, [assignments])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenCell(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(startDate, i)), [startDate])
  const endDate = days[13]

  const windowLabel = `${new Date(startDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${new Date(endDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`

  const allPublished = assignments.length > 0 && assignments.every((a) => a.is_published)

  function goToWeek(offset: number) {
    router.push(`/shifts?start=${addDays(startDate, offset)}`)
  }

  function handleAssign(lifeguardId: string, date: string, shiftCode: string | null) {
    setOpenCell(null)
    const prev = byKey[key(lifeguardId, date)]
    setByKey((m) => {
      const next = { ...m }
      const k = key(lifeguardId, date)
      if (shiftCode === null) {
        delete next[k]
      } else {
        next[k] = {
          id: prev?.id ?? k,
          facility_id: prev?.facility_id ?? '',
          lifeguard_id: lifeguardId,
          work_date: date,
          shift_code: shiftCode,
          start_time: null,
          end_time: null,
          is_published: false,
        }
      }
      return next
    })
    setShiftAssignment(lifeguardId, date, shiftCode).catch((err) => {
      toast.error(err.message ?? 'Failed to save shift')
    })
  }

  function handlePublish() {
    startPublishTransition(async () => {
      try {
        await publishSchedule(startDate, endDate)
        toast.success(`Schedule published for ${windowLabel}`, {
          description: 'Your team has been notified.',
        })
        router.refresh()
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to publish schedule')
      }
    })
  }

  function handleCopyPreviousWeek() {
    startCopyTransition(async () => {
      try {
        await copyPreviousWeek(startDate)
        toast.success('Copied last two weeks’ schedule into this window.')
        router.refresh()
      } catch (err: any) {
        toast.error(err.message ?? 'Failed to copy previous schedule')
      }
    })
  }

  return (
    <div className="px-8 py-6">
      {/* Header */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Shift Schedule</h1>
          <p className="text-gray-500 text-sm">
            {facilityName} · <b className="text-gray-700">{windowLabel}</b> · {staff.length} staff
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
            Import from Excel
          </button>
          <button
            onClick={handleCopyPreviousWeek}
            disabled={copying}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-60 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            {copying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Copy previous 2 weeks
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-70 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {publishing ? 'Publishing…' : 'Publish schedule'}
          </button>
        </div>
      </div>

      {/* Week nav + status */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1">
          <button onClick={() => goToWeek(-14)} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => goToWeek(14)} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${allPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {allPublished ? 'Published' : 'Draft'}
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <CalendarRange className="w-3.5 h-3.5 text-gray-400" /> Two-week window
        </span>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {shiftTypes.map((s) => (
            <span key={s.code} className="flex items-center gap-1.5">
              <span className={`inline-flex w-5 h-5 items-center justify-center border rounded text-[10px] font-bold ${COLOR_CLASSES[s.color]}`}>{s.code}</span>
              {s.label} {s.start}–{s.end}
            </span>
          ))}
          <span className="text-gray-400">— Off</span>
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide sticky left-0 bg-gray-50">
                Staff
              </th>
              {days.map((d) => {
                const date = new Date(d + 'T00:00:00')
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                return (
                  <th key={d} className={`px-1 py-2 text-center text-[10px] font-semibold uppercase ${isWeekend ? 'text-amber-500' : 'text-gray-400'}`}>
                    <div>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div className="text-gray-500">{date.getDate()}</div>
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
                        {person.role === 'supervisor' ? 'Supervisor' : 'Lifeguard'}
                      </p>
                    </div>
                  </div>
                </td>
                {days.map((date) => {
                  const assignment = byKey[key(person.id, date)]
                  const shiftType = assignment?.shift_code
                    ? shiftTypes.find((s) => s.code === assignment.shift_code)
                    : undefined
                  const isOpen = openCell?.lifeguardId === person.id && openCell?.date === date
                  return (
                    <td key={date} className="px-1 py-2 text-center relative">
                      <button
                        onClick={() => setOpenCell(isOpen ? null : { lifeguardId: person.id, date })}
                        className={`inline-flex w-8 h-7 items-center justify-center border rounded text-[10px] font-bold transition-colors ${
                          shiftType ? COLOR_CLASSES[shiftType.color] : assignment?.start_time ? 'bg-gray-100 text-gray-600 border-gray-300' : 'text-gray-300 border-transparent hover:border-gray-200'
                        }`}
                      >
                        {shiftType ? shiftType.code : assignment?.start_time ? '•' : '—'}
                      </button>

                      {isOpen && (
                        <div
                          ref={menuRef}
                          className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-1.5 flex flex-col gap-1 min-w-[120px]"
                        >
                          {shiftTypes.map((s) => (
                            <button
                              key={s.code}
                              onClick={() => handleAssign(person.id, date, s.code)}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium hover:bg-gray-50 transition-colors ${COLOR_CLASSES[s.color]}`}
                            >
                              <span className="font-bold">{s.code}</span>
                              {s.label}
                            </button>
                          ))}
                          <button
                            onClick={() => handleAssign(person.id, date, null)}
                            className="px-2 py-1.5 rounded text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors text-left"
                          >
                            Off
                          </button>
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Click a cell to assign a shift. Changes save immediately — hit Publish when you&apos;re ready to notify your team.
      </p>

      {showImport && (
        <ScheduleImportModal
          staff={staff}
          onClose={() => setShowImport(false)}
          onImported={() => {
            setShowImport(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
