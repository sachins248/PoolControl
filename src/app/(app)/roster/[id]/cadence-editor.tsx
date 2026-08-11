'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { SlidersHorizontal, RotateCcw } from 'lucide-react'
import { saveCadenceOverride } from './actions'
import type { AuditTypeName } from '@/types'

const CORE_TYPES: { type: AuditTypeName; label: string }[] = [
  { type: 'scanning', label: 'Scanning' },
  { type: 'vat', label: 'VAT' },
  { type: 'cpr_skills', label: 'CPR / Skills' },
  { type: 'dispatch', label: 'Dispatch' },
]

interface Props {
  lifeguardId: string
  facilityCadence: Record<string, number>
  override: Partial<Record<AuditTypeName, number>> | null
}

/**
 * Manager control: per-lifeguard audit frequency. Empty field = facility default.
 * The adaptive rule (halved interval after a failed audit) applies on top of
 * whichever base is in effect and is shown on the schedule card, not here.
 */
export function CadenceEditor({ lifeguardId, facilityCadence, override }: Props) {
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {}
    for (const { type } of CORE_TYPES) v[type] = override?.[type] != null ? String(override[type]) : ''
    return v
  })
  const [pending, startTransition] = useTransition()

  function handleSave() {
    const payload: Partial<Record<AuditTypeName, number>> = {}
    for (const { type } of CORE_TYPES) {
      const raw = values[type].trim()
      if (raw !== '') payload[type] = Number(raw)
    }
    startTransition(async () => {
      const { error } = await saveCadenceOverride(
        lifeguardId,
        Object.keys(payload).length > 0 ? payload : null,
      )
      if (error) toast.error(error)
      else {
        toast.success('Audit frequency updated')
        setOpen(false)
      }
    })
  }

  function handleReset() {
    startTransition(async () => {
      const { error } = await saveCadenceOverride(lifeguardId, null)
      if (error) toast.error(error)
      else {
        setValues({ scanning: '', vat: '', cpr_skills: '', dispatch: '' })
        toast.success('Reset to facility defaults')
        setOpen(false)
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-600 font-medium transition-colors"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" /> Adjust frequency
      </button>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <p className="text-xs text-gray-500">
        Days between required audits for this lifeguard. Leave blank to use the facility default.
      </p>
      <div className="grid grid-cols-2 gap-3">
        {CORE_TYPES.map(({ type, label }) => (
          <label key={type} className="block">
            <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
              {label}
            </span>
            <input
              type="number"
              min={1}
              max={365}
              value={values[type]}
              onChange={(e) => setValues((v) => ({ ...v, [type]: e.target.value }))}
              placeholder={`${facilityCadence[type] ?? 30}`}
              className="w-full px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg"
            />
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={pending}
          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={handleReset}
          disabled={pending}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
        >
          <RotateCcw className="w-3 h-3" /> Facility defaults
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={pending}
          className="ml-auto px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
