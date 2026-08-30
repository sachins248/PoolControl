'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, ShieldAlert } from 'lucide-react'
import { addAdvisement, deleteAdvisement } from './advisement-actions'
import type { AdvisementKind, StaffAdvisement } from '@/types'

const KINDS: { value: AdvisementKind; label: string }[] = [
  { value: 'medical_restriction', label: 'Medical restriction' },
  { value: 'duty_restriction', label: 'Duty restriction' },
  { value: 'written_advisement', label: 'Written advisement' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'return_to_duty', label: 'Return to duty' },
]

const KIND_LABEL: Record<string, string> =
  Object.fromEntries(KINDS.map((k) => [k.value, k.label]))

export function AdvisementsPanel({
  userId, advisements,
}: { userId: string; advisements: StaffAdvisement[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<AdvisementKind>('duty_restriction')
  const [restriction, setRestriction] = useState('')
  const [issuedBy, setIssuedBy] = useState('')
  const [from, setFrom] = useState(new Date().toISOString().slice(0, 10))
  const [to, setTo] = useState('')

  const input = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400'
  const today = new Date().toISOString().slice(0, 10)

  function save() {
    startTransition(async () => {
      const res = await addAdvisement({ userId, kind, restriction, issuedBy, effectiveFrom: from, effectiveTo: to })
      if (res.error) { toast.error(res.error); return }
      toast.success('Advisement recorded.')
      setRestriction(''); setIssuedBy(''); setTo(''); setOpen(false)
      router.refresh()
    })
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Restrictions &amp; Advisements</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Duty restrictions affecting assignment. Appears on the liability report.
          </p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Plus className="w-3.5 h-3.5" /> {open ? 'Cancel' : 'Add'}
        </button>
      </div>

      {advisements.length === 0 && !open && (
        <p className="text-sm text-gray-400">None on record.</p>
      )}

      <div className="space-y-2">
        {advisements.map((a) => {
          const active = !a.effective_to || a.effective_to >= today
          return (
            <div key={a.id} className="flex items-start justify-between gap-3 py-2 border-t border-gray-100 first:border-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-900">{KIND_LABEL[a.kind] ?? a.kind}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${active ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {active ? 'Active' : 'Expired'}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-0.5">{a.restriction}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {a.effective_from} → {a.effective_to ?? 'open-ended'}
                  {a.issued_by && ` · ${a.issued_by}`}
                </p>
              </div>
              <button
                onClick={() => startTransition(async () => {
                  const r = await deleteAdvisement(a.id, userId)
                  if (r.error) toast.error(r.error)
                  else { toast.success('Removed.'); router.refresh() }
                })}
                disabled={pending}
                className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-40 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )
        })}
      </div>

      {open && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
          <p className="text-xs text-amber-700 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Record the <strong>restriction</strong>, not the diagnosis or medical condition.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={kind} onChange={(e) => setKind(e.target.value as AdvisementKind)} className={input}>
                {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Issued by</label>
              <input value={issuedBy} onChange={(e) => setIssuedBy(e.target.value)} placeholder="Physician, HR…" className={input} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Effective from</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={input} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Until (blank = open-ended)</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={input} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Restriction (do not record diagnosis or medical condition)
            </label>
            <input
              value={restriction} onChange={(e) => setRestriction(e.target.value)}
              placeholder="e.g. No tower rotation for 6 weeks; deck duty only"
              className={input}
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={save} disabled={pending || !restriction.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
            >
              {pending && <Loader2 className="w-4 h-4 animate-spin" />}
              Record advisement
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
