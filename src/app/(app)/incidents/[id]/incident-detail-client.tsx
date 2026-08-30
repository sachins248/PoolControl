'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, Lock, FilePlus2, CheckCircle2 } from 'lucide-react'
import { addAmendment, submitIncident, reviewIncident } from '../actions'
import type { Incident, IncidentAmendment } from '@/types'

const KIND_LABEL: Record<string, string> = {
  save: 'Save / rescue', assist: 'Assist', first_aid: 'First aid',
  medical_emergency: 'Medical emergency', guest_injury: 'Guest injury', other: 'Other',
}
const ROLE_LABEL: Record<string, string> = {
  primary_rescuer: 'Primary rescuer', assist: 'Assisted', first_aid: 'Gave first aid',
  supervisor: 'Supervisor on scene', witness: 'Witness',
}

interface Props {
  incident: Incident
  responders: { id: string; role: string; name: string }[]
  amendments: (IncidentAmendment & { authorName: string })[]
  waterBodyName: string | null
  timeZone: string
  canReview: boolean
  canAmend: boolean
}

export function IncidentDetailClient({
  incident, responders, amendments, waterBodyName, timeZone, canReview, canAmend,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [amendText, setAmendText] = useState('')
  const [showAmend, setShowAmend] = useState(false)
  const [reviewNotes, setReviewNotes] = useState(incident.review_notes ?? '')
  const [corrective, setCorrective] = useState(incident.corrective_action ?? '')

  const isDraft = incident.status === 'draft'
  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZone,
    }) : '—'

  function run(fn: () => Promise<{ error?: string }>, ok: string) {
    startTransition(async () => {
      const res = await fn()
      if (res.error) toast.error(res.error)
      else { toast.success(ok); router.refresh() }
    })
  }

  const field = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400'

  return (
    <div className="px-8 py-6 max-w-3xl">
      <Link href="/incidents" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Incidents
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{KIND_LABEL[incident.kind] ?? incident.kind}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {fmt(incident.occurred_at)}{waterBodyName ? ` · ${waterBodyName}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2.5 py-1 rounded text-xs font-semibold capitalize ${
            incident.severity === 'severe' ? 'bg-red-100 text-red-700'
              : incident.severity === 'moderate' ? 'bg-amber-100 text-amber-700'
              : 'bg-gray-100 text-gray-600'}`}>
            {incident.severity}
          </span>
          <span className="px-2.5 py-1 rounded text-xs font-semibold capitalize bg-gray-100 text-gray-600">
            {incident.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {isDraft ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-center justify-between gap-4">
          <p className="text-sm text-amber-800">
            This is a draft. It is still editable and does not appear on liability reports until filed.
          </p>
          <button
            onClick={() => run(() => submitIncident(incident.id), 'Incident filed.')}
            disabled={pending}
            className="shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-white text-sm font-semibold rounded-lg"
          >
            File it
          </button>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-gray-400 mb-5">
          <Lock className="w-3.5 h-3.5" />
          Filed {fmt(incident.submitted_at)} — the narrative below is locked. Corrections are filed as amendments.
        </p>
      )}

      {/* Record */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4 mb-5">
        <Section title="What happened">{incident.narrative}</Section>
        {incident.actions_taken && <Section title="Actions taken">{incident.actions_taken}</Section>}
        <div className="grid grid-cols-2 gap-4 pt-1">
          <Meta label="Outcome" value={incident.outcome} />
          <Meta label="EMS called" value={incident.ems_called ? 'Yes' : 'No'} />
          <Meta label="Guest" value={[incident.guest_name, incident.guest_age ? `age ${incident.guest_age}` : null].filter(Boolean).join(' · ') || null} />
          <Meta label="Witnesses" value={incident.witnesses} />
        </div>
      </div>

      {/* Responders */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">Responders</h2>
        {responders.length === 0 ? (
          <p className="text-sm text-gray-400">None recorded.</p>
        ) : (
          <div className="space-y-2">
            {responders.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <span className="text-gray-900">{r.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${r.role === 'primary_rescuer' ? 'bg-emerald-100 text-emerald-700 font-medium' : 'bg-gray-100 text-gray-600'}`}>
                  {ROLE_LABEL[r.role] ?? r.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Amendments */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Amendments</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Appended, numbered, and attributed. Nothing above is rewritten.
            </p>
          </div>
          {canAmend && !isDraft && (
            <button
              onClick={() => setShowAmend((s) => !s)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FilePlus2 className="w-3.5 h-3.5" /> {showAmend ? 'Cancel' : 'Add amendment'}
            </button>
          )}
        </div>

        {amendments.length === 0 && !showAmend && (
          <p className="text-sm text-gray-400">No amendments filed.</p>
        )}

        <div className="space-y-3">
          {amendments.map((a) => (
            <div key={a.id} className="border-l-2 border-gray-200 pl-3">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-1">
                Amendment #{a.seq} · {a.authorName} · {fmt(a.created_at)}
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{a.body}</p>
            </div>
          ))}
        </div>

        {showAmend && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <textarea
              value={amendText} onChange={(e) => setAmendText(e.target.value)} rows={3}
              placeholder="e.g. EMS run number 24-8817 received from Coppell FD on 8/29."
              className={field}
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={() => run(async () => {
                  const r = await addAmendment(incident.id, amendText)
                  if (!r.error) { setAmendText(''); setShowAmend(false) }
                  return r
                }, 'Amendment filed.')}
                disabled={pending || !amendText.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-50 text-white text-xs font-medium rounded-lg"
              >
                {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                File amendment
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Review */}
      {canReview && !isDraft && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-8">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Management review</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Review notes</label>
              <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={2} className={field} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Corrective action</label>
              <textarea
                value={corrective} onChange={(e) => setCorrective(e.target.value)} rows={2}
                placeholder="e.g. Re-brief tower rotation spacing at Monday in-service."
                className={field}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => run(() => reviewIncident(incident.id, { reviewNotes, correctiveAction: corrective, close: false }), 'Review saved.')}
                disabled={pending}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
              >
                Save review
              </button>
              <button
                onClick={() => run(() => reviewIncident(incident.id, { reviewNotes, correctiveAction: corrective, close: true }), 'Incident closed.')}
                disabled={pending || incident.status === 'closed'}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold rounded-lg"
              >
                <CheckCircle2 className="w-4 h-4" />
                {incident.status === 'closed' ? 'Closed' : 'Close incident'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-sm text-gray-800 whitespace-pre-wrap">{children}</p>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-sm text-gray-700">{value || '—'}</p>
    </div>
  )
}
