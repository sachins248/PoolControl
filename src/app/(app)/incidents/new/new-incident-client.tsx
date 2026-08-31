'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Plus, X, ShieldAlert } from 'lucide-react'
import { createIncident } from '../actions'
import type { IncidentKind, IncidentSeverity, ResponderRole, UserProfile, WaterBody } from '@/types'

const KINDS: { value: IncidentKind; label: string }[] = [
  { value: 'save', label: 'Save / rescue' },
  { value: 'assist', label: 'Assist' },
  { value: 'first_aid', label: 'First aid' },
  { value: 'medical_emergency', label: 'Medical emergency' },
  { value: 'guest_injury', label: 'Guest injury' },
  { value: 'other', label: 'Other' },
]

const ROLES: { value: ResponderRole; label: string }[] = [
  { value: 'primary_rescuer', label: 'Primary rescuer' },
  { value: 'assist', label: 'Assisted' },
  { value: 'first_aid', label: 'Gave first aid' },
  { value: 'supervisor', label: 'Supervisor on scene' },
  { value: 'witness', label: 'Witness' },
]

const SEVERITIES: { value: IncidentSeverity; label: string; hint: string }[] = [
  { value: 'minor', label: 'Minor', hint: 'No lasting effect' },
  { value: 'moderate', label: 'Moderate', hint: 'Treatment needed' },
  { value: 'severe', label: 'Severe', hint: 'EMS / hospital' },
]

function localNow() {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export function NewIncidentClient({
  waterBodies, staff,
}: { waterBodies: WaterBody[]; staff: UserProfile[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [occurredAt, setOccurredAt] = useState(localNow())
  const [waterBodyId, setWaterBodyId] = useState('')
  const [kind, setKind] = useState<IncidentKind>('save')
  const [severity, setSeverity] = useState<IncidentSeverity>('minor')
  const [guestName, setGuestName] = useState('')
  const [guestAge, setGuestAge] = useState('')
  const [narrative, setNarrative] = useState('')
  const [actionsTaken, setActionsTaken] = useState('')
  const [emsCalled, setEmsCalled] = useState(false)
  const [outcome, setOutcome] = useState('')
  const [witnesses, setWitnesses] = useState('')
  const [responders, setResponders] = useState<{ userId: string; role: ResponderRole }[]>([
    { userId: '', role: 'primary_rescuer' },
  ])

  function submit(asDraft: boolean) {
    startTransition(async () => {
      const res = await createIncident({
        occurredAt, waterBodyId: waterBodyId || null, kind, severity,
        guestName, guestAge, narrative, actionsTaken, emsCalled, outcome, witnesses,
        responders, asDraft,
      })
      if (res.error) { toast.error(res.error); return }
      toast.success(asDraft ? 'Draft saved.' : 'Incident filed.')
      router.push(res.id ? `/incidents/${res.id}` : '/incidents')
    })
  }

  const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400'
  const label = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <div className="px-8 py-6 max-w-3xl">
      <Link href="/incidents" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Incidents
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">File an incident</h1>
      <p className="text-gray-500 text-sm mb-6">
        Once filed, the narrative is locked. Corrections are added as numbered amendments so the
        original record stays intact.
      </p>

      <div className="space-y-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-2 gap-4">
          <div>
            <label className={label}>When did it happen? *</label>
            <input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)} className={input} />
          </div>
          <div>
            <label className={label}>Where</label>
            <select value={waterBodyId} onChange={(e) => setWaterBodyId(e.target.value)} className={input}>
              <option value="">Select…</option>
              {waterBodies.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Type *</label>
            <select value={kind} onChange={(e) => setKind(e.target.value as IncidentKind)} className={input}>
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </div>
          <div>
            <label className={label}>Severity *</label>
            <div className="flex gap-1.5">
              {SEVERITIES.map((s) => (
                <button
                  key={s.value} type="button" onClick={() => setSeverity(s.value)}
                  title={s.hint}
                  className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium border transition-colors ${
                    severity === s.value
                      ? s.value === 'severe' ? 'bg-red-500 border-red-500 text-white'
                        : s.value === 'moderate' ? 'bg-amber-500 border-amber-500 text-white'
                        : 'bg-gray-700 border-gray-700 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Responders */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Who responded</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                This is what links the incident to each guard&apos;s liability report.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setResponders((r) => [...r, { userId: '', role: 'assist' }])}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {responders.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={r.userId}
                  onChange={(e) => setResponders((rs) => rs.map((x, j) => j === i ? { ...x, userId: e.target.value } : x))}
                  className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="">Select staff…</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select
                  value={r.role}
                  onChange={(e) => setResponders((rs) => rs.map((x, j) => j === i ? { ...x, role: e.target.value as ResponderRole } : x))}
                  className="w-44 shrink-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {ROLES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {responders.length > 1 && (
                  <button type="button" onClick={() => setResponders((rs) => rs.filter((_, j) => j !== i))} className="p-1.5 text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Narrative */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <label className={label}>What happened? *</label>
            <textarea
              value={narrative} onChange={(e) => setNarrative(e.target.value)} rows={5}
              placeholder="Factual sequence of events, in order. Avoid speculation or opinion."
              className={input}
            />
          </div>
          <div>
            <label className={label}>Actions taken</label>
            <textarea
              value={actionsTaken} onChange={(e) => setActionsTaken(e.target.value)} rows={3}
              placeholder="Extraction method, CPR, spinal immobilisation, oxygen, AED…"
              className={input}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Outcome</label>
              <input value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="Released on scene / transported…" className={input} />
            </div>
            <div>
              <label className={label}>Witnesses</label>
              <input value={witnesses} onChange={(e) => setWitnesses(e.target.value)} placeholder="Names, if any" className={input} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={emsCalled} onChange={(e) => setEmsCalled(e.target.checked)} className="rounded" />
            EMS was called
          </label>
        </div>

        {/* Guest */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">Guest involved</h2>
          <p className="text-xs text-gray-500 mb-3 flex items-start gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
            Record only what you need for the report. Do not enter medical conditions, diagnoses, or
            identifiers like date of birth.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Name</label>
              <input value={guestName} onChange={(e) => setGuestName(e.target.value)} className={input} />
            </div>
            <div>
              <label className={label}>Age</label>
              <input type="number" min="0" max="120" value={guestAge} onChange={(e) => setGuestAge(e.target.value)} className={input} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pb-8">
          <button
            onClick={() => submit(true)} disabled={pending}
            className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
          >
            Save as draft
          </button>
          <button
            onClick={() => submit(false)} disabled={pending}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {pending && <Loader2 className="w-4 h-4 animate-spin" />}
            File incident
          </button>
        </div>
      </div>
    </div>
  )
}
