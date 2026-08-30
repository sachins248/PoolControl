'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Droplets, AlertTriangle, Ban, CheckCircle2, Wrench } from 'lucide-react'
import { logReading, markCorrected } from './actions'
import { CHEM_PARAMS, CHEM_LABEL, describeBreach, minutesUntilDue } from '@/lib/chemistry'
import type { BodyStatus } from './page'
import type { ChemParam, ChemistryReading } from '@/types'

interface Props {
  statuses: BodyStatus[]
  readings: ChemistryReading[]
  timeZone: string
  canManage: boolean
}

function dueLabel(mins: number | null): { text: string; tone: 'ok' | 'soon' | 'over' | 'never' } {
  if (mins === null) return { text: 'Never tested', tone: 'never' }
  if (mins < 0) return { text: `Overdue by ${fmtMins(-mins)}`, tone: 'over' }
  if (mins < 30) return { text: `Due in ${fmtMins(mins)}`, tone: 'soon' }
  return { text: `Due in ${fmtMins(mins)}`, tone: 'ok' }
}

function fmtMins(m: number) {
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h}h ${r}m` : `${h}h`
}

export function ChemistryClient({ statuses, readings, timeZone, canManage }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [openBody, setOpenBody] = useState<string | null>(null)
  const [values, setValues] = useState<Partial<Record<ChemParam, string>>>({})
  const [notes, setNotes] = useState('')
  const [fixNote, setFixNote] = useState<Record<string, string>>({})

  const fmt = (d: string) =>
    new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone,
    })

  function submit(bodyId: string, retestOf?: string | null) {
    startTransition(async () => {
      const res = await logReading({ waterBodyId: bodyId, values, notes, retestOf })
      if (res.error) { toast.error(res.error); return }
      if (res.status === 'closure_required') toast.error('Closure required — reading is outside health-code limits.')
      else if (res.status === 'out_of_range') toast.warning('Logged — one or more readings are out of range.')
      else toast.success('Reading logged.')
      setValues({}); setNotes(''); setOpenBody(null)
      router.refresh()
    })
  }

  const input = 'w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400'

  return (
    <div className="px-8 py-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Water Chemistry</h1>
        <p className="text-gray-500 text-sm">
          Health code requires testing every few hours while open, with records retained. Every
          reading here is timestamped, attributed, and permanent.
        </p>
      </div>

      {/* Per-body status */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {statuses.map((s) => {
          const due = dueLabel(minutesUntilDue(s.lastTestedAt, s.intervalMinutes))
          const isOpen = openBody === s.body.id
          return (
            <div
              key={s.body.id}
              className={`bg-white border rounded-xl p-4 ${
                s.openIssue?.status === 'closure_required' ? 'border-red-300'
                  : s.openIssue ? 'border-amber-300' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{s.body.name}</p>
                  <p className={`text-xs mt-0.5 ${
                    due.tone === 'over' ? 'text-red-600 font-medium'
                      : due.tone === 'soon' ? 'text-amber-600'
                      : due.tone === 'never' ? 'text-gray-400'
                      : 'text-gray-500'
                  }`}>{due.text}</p>
                </div>
                {s.openIssue?.status === 'closure_required' ? (
                  <Ban className="w-4 h-4 text-red-500 shrink-0" />
                ) : s.openIssue ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                )}
              </div>

              {s.openIssue && (
                <div className={`mt-3 p-2.5 rounded-lg text-xs ${
                  s.openIssue.status === 'closure_required' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'
                }`}>
                  <p className="font-semibold mb-1">
                    {s.openIssue.status === 'closure_required' ? 'Closure required' : 'Out of range'}
                  </p>
                  {(s.openIssue.breaches ?? []).map((b, i) => (
                    <p key={i}>{describeBreach(b)}</p>
                  ))}
                  <div className="mt-2 flex gap-1.5">
                    <input
                      value={fixNote[s.openIssue.id] ?? ''}
                      onChange={(e) => setFixNote((f) => ({ ...f, [s.openIssue!.id]: e.target.value }))}
                      placeholder="What was done…"
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs bg-white"
                    />
                    <button
                      onClick={() => startTransition(async () => {
                        const r = await markCorrected(s.openIssue!.id, fixNote[s.openIssue!.id] ?? '')
                        if (r.error) toast.error(r.error)
                        else { toast.success('Marked corrected — log a retest to confirm.'); router.refresh() }
                      })}
                      disabled={pending}
                      className="px-2 py-1 bg-gray-900 text-white rounded text-xs font-medium disabled:opacity-50"
                    >
                      <Wrench className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={() => { setOpenBody(isOpen ? null : s.body.id); setValues({}); setNotes('') }}
                className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <Droplets className="w-3.5 h-3.5" />
                {isOpen ? 'Cancel' : 'Log reading'}
              </button>

              {isOpen && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  {CHEM_PARAMS.map((p) => (
                    <div key={p.key} className="flex items-center gap-2">
                      <label className="flex-1 text-xs text-gray-600">
                        {p.label}{p.unit && <span className="text-gray-400"> ({p.unit})</span>}
                      </label>
                      <input
                        type="number" step={p.step} inputMode="decimal"
                        value={values[p.key] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [p.key]: e.target.value }))}
                        className={`${input} w-24`}
                      />
                    </div>
                  ))}
                  <input
                    value={notes} onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes (optional)" className={input}
                  />
                  <button
                    onClick={() => submit(s.body.id, s.openIssue?.id ?? null)}
                    disabled={pending}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 text-white text-xs font-semibold rounded-lg"
                  >
                    {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {s.openIssue ? 'Log retest' : 'Save reading'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {statuses.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl py-12 text-center mb-8">
          <p className="text-sm text-gray-500">No water bodies configured yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            {canManage ? 'They seed automatically from your facility zones.' : 'Ask a manager to set them up.'}
          </p>
        </div>
      )}

      {/* Log */}
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Recent readings</h2>
      {readings.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-10 text-center text-sm text-gray-400">
          No readings logged yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
          <table className="w-full text-sm min-w-[760px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left px-4 py-3">Tested</th>
                <th className="text-left px-4 py-3">Body</th>
                {CHEM_PARAMS.slice(0, 4).map((p) => (
                  <th key={p.key} className="text-center px-3 py-3">{p.label.split(' ')[0]}</th>
                ))}
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {readings.slice(0, 50).map((r, i) => {
                const bodyName = statuses.find((s) => s.body.id === r.water_body_id)?.body.name ?? '—'
                return (
                  <tr key={r.id} className={`border-b border-gray-50 last:border-0 ${i % 2 ? 'bg-gray-50/40' : ''}`}>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmt(r.tested_at)}</td>
                    <td className="px-4 py-2.5 text-gray-900 font-medium">{bodyName}</td>
                    {CHEM_PARAMS.slice(0, 4).map((p) => {
                      const breached = (r.breaches ?? []).some((b) => b.param === p.key)
                      const v = r[p.key]
                      return (
                        <td key={p.key} className={`px-3 py-2.5 text-center ${breached ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                          {v ?? '—'}
                        </td>
                      )
                    })}
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        r.status === 'closure_required' ? 'bg-red-100 text-red-700'
                          : r.status === 'out_of_range' ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {r.status === 'closure_required' ? 'Closure' : r.status === 'out_of_range' ? 'Out of range' : 'OK'}
                      </span>
                      {r.corrected_at && <span className="ml-1.5 text-[10px] text-gray-400">corrected</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-gray-400">
        Showing {Math.min(readings.length, 50)} of {readings.length}. Columns:{' '}
        {CHEM_PARAMS.slice(0, 4).map((p) => CHEM_LABEL[p.key]).join(', ')}.
      </p>
    </div>
  )
}
