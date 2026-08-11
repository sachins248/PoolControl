'use client'

import { useState, useTransition, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

const NEXT_STATUS: Record<string, { label: string; value: string }[]> = {
  assigned: [
    { label: 'Mark Acknowledged', value: 'acknowledged' },
    { label: 'Put In Deck', value: 'in_deck' },
    { label: 'Mark Verified', value: 'verified' },
    { label: 'Escalate', value: 'escalated' },
  ],
  acknowledged: [
    { label: 'Put In Deck', value: 'in_deck' },
    { label: 'Mark Verified', value: 'verified' },
    { label: 'Escalate', value: 'escalated' },
  ],
  in_deck: [
    { label: 'Mark Verified', value: 'verified' },
    { label: 'Escalate', value: 'escalated' },
  ],
}

export function RemediationActions({ taskId, currentStatus }: { taskId: string; currentStatus: string }) {
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, right: 0 })
  const [isPending, startTransition] = useTransition()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const supabase = createClient()
  const router = useRouter()
  const options = NEXT_STATUS[currentStatus] ?? []

  if (options.length === 0) return null

  function handleToggle() {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setCoords({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
    }
    setOpen((v) => !v)
  }

  function updateStatus(newStatus: string) {
    setOpen(false)
    startTransition(async () => {
      await supabase.from('remediation_tasks').update({ status: newStatus }).eq('id', taskId)
      router.refresh()
    })
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleToggle}
        disabled={isPending}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium border border-gray-200 rounded-md px-2.5 py-1.5 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        Update <ChevronDown className="w-3 h-3" />
      </button>

      {open && (
        <>
          {/* backdrop to close on outside click */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* dropdown — fixed so overflow:hidden on table doesn't clip it */}
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[168px]"
            style={{ top: coords.top, right: coords.right }}
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => updateStatus(opt.value)}
                className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
