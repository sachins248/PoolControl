'use client'

import { useState, useTransition } from 'react'
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
    { label: 'Mark Verified ✓', value: 'verified' },
    { label: 'Escalate', value: 'escalated' },
  ],
}

export function RemediationActions({ taskId, currentStatus }: { taskId: string; currentStatus: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()
  const router = useRouter()
  const options = NEXT_STATUS[currentStatus] ?? []

  if (options.length === 0) return null

  function updateStatus(newStatus: string) {
    setOpen(false)
    startTransition(async () => {
      await supabase
        .from('remediation_tasks')
        .update({ status: newStatus })
        .eq('id', taskId)
      router.refresh()
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium border border-gray-200 rounded px-2 py-1 hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        Update <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[160px]">
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
