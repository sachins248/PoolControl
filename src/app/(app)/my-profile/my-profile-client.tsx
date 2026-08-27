'use client'

import { CheckCircle, XCircle, Clock, AlertTriangle, Award } from 'lucide-react'
import type { UserProfile, Audit, RemediationTask, Certification } from '@/types'

interface Props {
  profile: UserProfile
  audits: Audit[]
  remediations: RemediationTask[]
  certifications: Certification[]
  lpr: number
}

function LPRBadge({ lpr }: { lpr: number }) {
  if (lpr === 0) return <span className="text-gray-400 text-sm">No audits yet</span>

  const color =
    lpr >= 4.0 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
    lpr >= 3.0 ? 'text-amber-600 bg-amber-50 border-amber-200' :
                 'text-red-600 bg-red-50 border-red-200'

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${color}`}>
      <span className="text-2xl font-bold">{lpr.toFixed(1)}</span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide">LPR Score</p>
        <p className="text-xs opacity-70">out of 5.0</p>
      </div>
    </div>
  )
}

function DeadlineCountdown({ deadline }: { deadline: string }) {
  const diff = new Date(deadline).getTime() - Date.now()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (diff < 0) return <span className="text-red-600 text-xs font-semibold">OVERDUE</span>
  if (hours < 24) return <span className="text-amber-600 text-xs font-semibold">{hours}h left</span>
  const days = Math.floor(hours / 24)
  return <span className="text-gray-500 text-xs">{days}d left</span>
}

const AUDIT_DISPLAY: Record<string, string> = {
  scanning: 'Scanning',
  vat: 'VAT',
  cpr_skills: 'CPR / Skills',
  dispatch: 'Dispatch',
  supervisor_eavs: 'EAVS',
  guest_service: 'Guest Service',
  cleaning: 'Cleaning',
}

export function MyProfileClient({ profile, audits, remediations, certifications, lpr }: Props) {
  const today = new Date()
  const expiringThreshold = new Date(today)
  expiringThreshold.setDate(today.getDate() + 30)

  const initials = profile.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="px-8 py-6 max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-center gap-5">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0"
          style={{ backgroundColor: profile.avatar_color ?? '#10b981' }}
        >
          {initials}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{profile.name}</h1>
          <p className="text-gray-500 text-sm capitalize">{profile.role} · {profile.email}</p>
        </div>
        <LPRBadge lpr={lpr} />
      </div>

      {/* Open Remediations */}
      {remediations.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Open Remediations ({remediations.length})
          </h2>
          <div className="space-y-2">
            {remediations.map((task) => (
              <div key={task.id} className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">Action Required</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Deadline: {new Date(task.deadline).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </p>
                </div>
                <DeadlineCountdown deadline={task.deadline} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Audit History */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Audit History</h2>
        {audits.length === 0 ? (
          <p className="text-gray-400 text-sm py-6 text-center">No audits on record yet.</p>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Zone</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Score</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Result</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit, i) => (
                  <tr key={audit.id} className={`border-b border-gray-50 last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {AUDIT_DISPLAY[audit.audit_type_name] ?? audit.audit_type_name}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{audit.zone ?? '—'}</td>
                    <td className="px-5 py-3 text-gray-700">
                      {audit.score !== null ? `${Math.round((audit.score / 5) * 100)}%` : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {audit.passed === true ? (
                        <span className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <CheckCircle className="w-3.5 h-3.5" /> Pass
                        </span>
                      ) : audit.passed === false ? (
                        <span className="flex items-center gap-1 text-red-500 text-xs font-medium">
                          <XCircle className="w-3.5 h-3.5" /> Fail
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-gray-400 text-xs">
                          <Clock className="w-3.5 h-3.5" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {audit.submitted_at
                        ? new Date(audit.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Certifications */}
      {certifications.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-500" />
            Certifications
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {certifications.map((cert) => {
              const expiry = new Date(cert.expiry)
              const isExpiring = expiry <= expiringThreshold && expiry >= today
              const isExpired = expiry < today
              return (
                <div
                  key={cert.id}
                  className={`rounded-xl border px-5 py-4 ${
                    isExpired ? 'bg-red-50 border-red-200' :
                    isExpiring ? 'bg-amber-50 border-amber-200' :
                    'bg-white border-gray-200'
                  }`}
                >
                  <p className="font-medium text-gray-900 text-sm capitalize">{cert.body.replace(/_/g, ' ')}</p>
                  <p className={`text-xs mt-0.5 ${isExpired ? 'text-red-600 font-semibold' : isExpiring ? 'text-amber-600 font-semibold' : 'text-gray-500'}`}>
                    {isExpired ? 'Expired' : isExpiring ? 'Expiring soon'  : 'Expires'}: {expiry.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
