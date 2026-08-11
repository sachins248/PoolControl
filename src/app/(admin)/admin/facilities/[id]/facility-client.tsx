'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { updateFacilityBilling, suspendFacility } from '../../actions'

interface Facility {
  id: string
  name: string
  plan: string
  billing_status: string
  trial_ends_at: string
  created_at: string
}

interface StaffMember {
  id: string
  name: string
  role: string
  email: string
  is_active: boolean
  created_at: string
}

const roleLabel: Record<string, string> = {
  director: 'Director',
  manager: 'Manager',
  supervisor: 'Supervisor',
  lifeguard: 'Lifeguard',
  corporate: 'Corporate',
}
const roleColor: Record<string, string> = {
  director: 'bg-purple-100 text-purple-700',
  manager: 'bg-purple-100 text-purple-700',
  supervisor: 'bg-amber-100 text-amber-700',
  lifeguard: 'bg-blue-100 text-blue-700',
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function toDateInput(dateStr: string) {
  return new Date(dateStr).toISOString().split('T')[0]
}

export default function FacilityClient({
  facility,
  staff,
}: {
  facility: Facility
  staff: StaffMember[]
}) {
  const [billing, setBilling] = useState({
    plan: facility.plan,
    billing_status: facility.billing_status,
    trial_ends_at: toDateInput(facility.trial_ends_at),
  })
  const [isPending, startTransition] = useTransition()
  const [isSuspending, startSuspendTransition] = useTransition()
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [suspendError, setSuspendError] = useState<string | null>(null)
  const [confirmSuspend, setConfirmSuspend] = useState(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaveMsg(null)
    setSaveError(null)
    startTransition(async () => {
      try {
        await updateFacilityBilling(facility.id, {
          plan: billing.plan,
          billing_status: billing.billing_status,
          trial_ends_at: new Date(billing.trial_ends_at).toISOString(),
        })
        setSaveMsg('Saved.')
      } catch (err: unknown) {
        setSaveError(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  function handleSuspend() {
    setSuspendError(null)
    startSuspendTransition(async () => {
      try {
        await suspendFacility(facility.id)
        setBilling((b) => ({ ...b, billing_status: 'suspended' }))
        setConfirmSuspend(false)
      } catch (err: unknown) {
        setSuspendError(err instanceof Error ? err.message : 'Failed to suspend')
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-gray-400 hover:text-gray-600 text-sm transition-colors">
          ← All Facilities
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{facility.name}</h1>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${facility.plan === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {facility.plan}
        </span>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${facility.billing_status === 'active' ? 'bg-green-100 text-green-700' : facility.billing_status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
          {facility.billing_status}
        </span>
        <span className="text-xs text-gray-400 ml-auto">Created {fmt(facility.created_at)}</span>
      </div>

      {/* Billing edit */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-5">Billing</h2>
        <form onSubmit={handleSave} className="grid grid-cols-3 gap-5 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Plan</label>
            <select
              value={billing.plan}
              onChange={(e) => setBilling((b) => ({ ...b, plan: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 bg-gray-50"
            >
              <option value="trial">Trial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Billing Status</label>
            <select
              value={billing.billing_status}
              onChange={(e) => setBilling((b) => ({ ...b, billing_status: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 bg-gray-50"
            >
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Trial Ends</label>
            <input
              type="date"
              value={billing.trial_ends_at}
              onChange={(e) => setBilling((b) => ({ ...b, trial_ends_at: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 bg-gray-50"
            />
          </div>
          <div className="col-span-3 flex items-center gap-4">
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 bg-[#0f1e2e] hover:bg-[#1a3050] disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-colors"
            >
              {isPending ? 'Saving...' : 'Save Changes'}
            </button>
            {saveMsg && <p className="text-emerald-600 text-sm">{saveMsg}</p>}
            {saveError && <p className="text-red-500 text-sm">{saveError}</p>}
          </div>
        </form>
      </div>

      {/* Staff table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Staff ({staff.length})</h2>
        </div>
        {staff.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">No staff yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium">
                <th className="px-5 py-3 text-left">Name</th>
                <th className="px-5 py-3 text-left">Role</th>
                <th className="px-5 py-3 text-left">Email</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Added</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                  <td className="px-5 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${roleColor[s.role] ?? 'bg-gray-100 text-gray-500'}`}>
                      {roleLabel[s.role] ?? s.role}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{s.email}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400">{fmt(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-white rounded-xl border border-red-200 shadow-sm p-6">
        <h2 className="font-semibold text-red-600 mb-1">Danger Zone</h2>
        <p className="text-sm text-gray-500 mb-4">
          Suspending immediately signs out all active users and blocks access. This can be reversed by setting billing status back to active.
        </p>
        {!confirmSuspend ? (
          <button
            onClick={() => setConfirmSuspend(true)}
            disabled={facility.billing_status === 'suspended'}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed text-red-600 font-semibold text-sm rounded-lg border border-red-200 transition-colors"
          >
            {facility.billing_status === 'suspended' ? 'Already suspended' : 'Suspend facility'}
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">Are you sure? This signs out all users immediately.</span>
            <button
              onClick={handleSuspend}
              disabled={isSuspending}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-colors"
            >
              {isSuspending ? 'Suspending...' : 'Yes, suspend'}
            </button>
            <button
              onClick={() => setConfirmSuspend(false)}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
            >
              Cancel
            </button>
            {suspendError && <p className="text-red-500 text-sm">{suspendError}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
