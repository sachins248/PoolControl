import { requireUser, isManager } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, FileWarning } from 'lucide-react'
import type { Incident, WaterBody } from '@/types'

const KIND_LABEL: Record<string, string> = {
  save: 'Save / rescue', assist: 'Assist', first_aid: 'First aid',
  medical_emergency: 'Medical emergency', guest_injury: 'Guest injury', other: 'Other',
}

const SEVERITY_STYLE: Record<string, string> = {
  minor: 'bg-gray-100 text-gray-600',
  moderate: 'bg-amber-100 text-amber-700',
  severe: 'bg-red-100 text-red-700',
}

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  submitted: 'bg-blue-100 text-blue-700',
  under_review: 'bg-amber-100 text-amber-700',
  closed: 'bg-emerald-100 text-emerald-700',
}

export default async function IncidentsPage() {
  const profile = await requireUser()
  if (!profile.facility_id) return null

  const supabase = createClient()
  const [{ data: incidents }, { data: facility }, { data: bodies }] = await Promise.all([
    supabase
      .from('incidents')
      .select('*')
      .eq('facility_id', profile.facility_id)
      .order('occurred_at', { ascending: false })
      .limit(200),
    supabase.from('facilities').select('timezone').eq('id', profile.facility_id).single(),
    supabase.from('water_bodies').select('id, name').eq('facility_id', profile.facility_id),
  ])

  const timeZone = facility?.timezone ?? 'America/Chicago'
  const bodyName = new Map((bodies ?? []).map((b: Pick<WaterBody, 'id' | 'name'>) => [b.id, b.name]))
  const rows = (incidents ?? []) as Incident[]
  const canFile = isManager(profile.role) || profile.role === 'supervisor'

  const fmt = (d: string) =>
    new Date(d).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZone,
    })

  return (
    <div className="px-8 py-6 max-w-6xl">
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Incidents</h1>
          <p className="text-gray-500 text-sm">
            Saves, assists, first aid, and medical emergencies. {rows.length} on file.
          </p>
        </div>
        {canFile && (
          <Link
            href="/incidents/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> File incident
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-16 text-center">
          <FileWarning className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No incidents recorded yet.</p>
          <p className="text-xs text-gray-400 mt-1">
            Every save, first aid, and EMS call filed here appears on the guard&apos;s liability report.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-400 uppercase tracking-wide">
                <th className="text-left px-5 py-3">When</th>
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-left px-5 py-3">Location</th>
                <th className="text-left px-5 py-3">Severity</th>
                <th className="text-left px-5 py-3">EMS</th>
                <th className="text-left px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inc, i) => (
                <tr key={inc.id} className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/60 ${i % 2 ? 'bg-gray-50/40' : ''}`}>
                  <td className="px-5 py-3">
                    <Link href={`/incidents/${inc.id}`} className="text-gray-900 font-medium hover:text-emerald-600">
                      {fmt(inc.occurred_at)}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-700">{KIND_LABEL[inc.kind] ?? inc.kind}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {inc.water_body_id ? bodyName.get(inc.water_body_id) ?? '—' : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${SEVERITY_STYLE[inc.severity]}`}>
                      {inc.severity}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">{inc.ems_called ? 'Yes' : '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${STATUS_STYLE[inc.status]}`}>
                      {inc.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
