'use client'

import { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { onboardFacility } from './actions'

interface Facility {
  id: string
  name: string
  plan: string
  billing_status: string
  trial_ends_at: string
  created_at: string
  staffCount: number
  lastActive: string | null
}

const planChip: Record<string, string> = {
  trial: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
}
const statusChip: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtRelative(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

type StatFilter = 'all' | 'trials' | 'paid' | 'expired'

export default function AdminClient({ facilities }: { facilities: Facility[] }) {
  const now = new Date()

  const [statFilter, setStatFilter] = useState<StatFilter>('all')
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)

  const [form, setForm] = useState({ name: '', directorName: '', directorEmail: '' })
  const [isPending, startTransition] = useTransition()
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const stats = {
    total: facilities.length,
    activeTrials: facilities.filter(
      (f) => f.plan === 'trial' && f.billing_status === 'active' && new Date(f.trial_ends_at) > now,
    ).length,
    paid: facilities.filter((f) => f.plan === 'paid').length,
    expired: facilities.filter(
      (f) => f.billing_status === 'expired' || f.billing_status === 'suspended' || (f.plan === 'trial' && new Date(f.trial_ends_at) <= now),
    ).length,
    mrr: facilities
      .filter((f) => f.plan === 'paid')
      .reduce((sum, f) => sum + f.staffCount * 20, 0),
  }

  const filtered = useMemo(() => {
    let list = facilities

    if (statFilter === 'trials') list = list.filter((f) => f.plan === 'trial' && f.billing_status === 'active' && new Date(f.trial_ends_at) > now)
    else if (statFilter === 'paid') list = list.filter((f) => f.plan === 'paid')
    else if (statFilter === 'expired') list = list.filter((f) => f.billing_status === 'expired' || f.billing_status === 'suspended' || (f.plan === 'trial' && new Date(f.trial_ends_at) <= now))

    if (search) list = list.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    if (planFilter) list = list.filter((f) => f.plan === planFilter)
    if (statusFilter) list = list.filter((f) => f.billing_status === statusFilter)

    return list
  }, [facilities, statFilter, search, planFilter, statusFilter])

  function handleStatClick(key: StatFilter) {
    setStatFilter((prev) => prev === key ? 'all' : key)
    setSearch('')
    setPlanFilter('')
    setStatusFilter('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      try {
        await onboardFacility(form.name, form.directorName, form.directorEmail)
        setSuccess(`${form.name} onboarded. Setup email sent to ${form.directorEmail}.`)
        setForm({ name: '', directorName: '', directorEmail: '' })
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  const statCards = [
    { key: 'all' as StatFilter, label: 'Total Facilities', value: stats.total, color: 'text-gray-900' },
    { key: 'trials' as StatFilter, label: 'Active Trials', value: stats.activeTrials, color: 'text-amber-600' },
    { key: 'paid' as StatFilter, label: 'Paying', value: stats.paid, color: 'text-emerald-600' },
    { key: 'expired' as StatFilter, label: 'Expired / Suspended', value: stats.expired, color: 'text-red-500' },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Facilities</h1>
        <button
          onClick={() => { setShowModal(true); setSuccess(null); setError(null) }}
          className="px-4 py-2 bg-[#0f1e2e] hover:bg-[#1a3050] text-white font-semibold text-sm rounded-lg transition-colors"
        >
          Onboard New Facility →
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        {statCards.map((s) => (
          <button
            key={s.key}
            onClick={() => handleStatClick(s.key)}
            className={`bg-white rounded-xl border p-5 shadow-sm text-left transition-all ${statFilter === s.key && s.key !== 'all' ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <div className={`text-3xl font-bold tracking-tight ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
            {statFilter === s.key && s.key !== 'all' && (
              <div className="text-xs text-indigo-500 mt-1">Filtered ✕</div>
            )}
          </button>
        ))}
        {/* MRR card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="text-3xl font-bold tracking-tight text-indigo-600">
            ${stats.mrr.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 mt-1">MRR</div>
          <div className="text-xs text-gray-400 mt-1">$20/seat · paid only</div>
        </div>
      </div>

      {/* Facilities table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <h2 className="font-semibold text-gray-900 text-sm shrink-0">
            All Facilities
            {filtered.length !== facilities.length && (
              <span className="ml-2 text-indigo-500 font-normal">({filtered.length} of {facilities.length})</span>
            )}
          </h2>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="flex-1 max-w-xs px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 bg-gray-50"
          />
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 bg-gray-50 text-gray-600"
          >
            <option value="">All plans</option>
            <option value="trial">Trial</option>
            <option value="paid">Paid</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 bg-gray-50 text-gray-600"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="suspended">Suspended</option>
          </select>
          {(search || planFilter || statusFilter || statFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setPlanFilter(''); setStatusFilter(''); setStatFilter('all') }}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">No facilities match your filters.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 font-medium">
                <th className="px-5 py-3 text-left">Facility</th>
                <th className="px-5 py-3 text-left">Plan</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-left">Trial Ends</th>
                <th className="px-5 py-3 text-left">Staff</th>
                <th className="px-5 py-3 text-left">Last Active</th>
                <th className="px-5 py-3 text-left">Created</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => (
                <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                  <td className="px-5 py-3.5 font-medium text-gray-900">{f.name}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${planChip[f.plan] ?? 'bg-gray-100 text-gray-500'}`}>
                      {f.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusChip[f.billing_status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {f.billing_status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {f.trial_ends_at ? fmt(f.trial_ends_at) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">{f.staffCount}</td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {f.lastActive ? (
                      <span title={fmt(f.lastActive)}>{fmtRelative(f.lastActive)}</span>
                    ) : (
                      <span className="text-gray-300">Never</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-400">{fmt(f.created_at)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <Link href={`/admin/facilities/${f.id}`} className="text-indigo-500 hover:text-indigo-700 font-medium text-xs">
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Onboard modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-7">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-gray-900 text-lg">Onboard New Facility</h2>
              <button
                onClick={() => { setShowModal(false); setSuccess(null); setError(null) }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none transition-colors"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-6">Creates the facility, director account, and sends a password setup email.</p>

            {success ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                  <span className="text-emerald-600 text-xl">✓</span>
                </div>
                <p className="text-emerald-700 font-medium text-sm">{success}</p>
                <button
                  onClick={() => { setShowModal(false); setSuccess(null) }}
                  className="px-5 py-2 bg-[#0f1e2e] text-white font-semibold text-sm rounded-lg"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Facility name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Coral Bay Water Park"
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Director full name</label>
                  <input
                    type="text"
                    value={form.directorName}
                    onChange={(e) => setForm((f) => ({ ...f, directorName: e.target.value }))}
                    placeholder="Jane Smith"
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Director email</label>
                  <input
                    type="email"
                    value={form.directorEmail}
                    onChange={(e) => setForm((f) => ({ ...f, directorEmail: e.target.value }))}
                    placeholder="jane@facility.com"
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 bg-gray-50"
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setError(null) }}
                    className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="px-5 py-2 bg-[#0f1e2e] hover:bg-[#1a3050] disabled:opacity-60 text-white font-semibold text-sm rounded-lg transition-colors"
                  >
                    {isPending ? 'Onboarding...' : 'Onboard Facility →'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
