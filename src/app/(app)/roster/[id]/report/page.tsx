import { requireUser, isManager } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react'
import { ReportActions } from './print-button'
import type { Audit, RemediationTask, Certification, AuditCriterionResult, Incident, StaffAdvisement } from '@/types'

function computeLPR(audits: Audit[]): number {
  const completed = audits.filter((a) => a.passed !== null)
  if (completed.length === 0) return 0
  const passRate = completed.filter((a) => a.passed).length / completed.length
  return Math.round((1 + passRate * 4) * 10) / 10
}

const AUDIT_DISPLAY: Record<string, string> = {
  scanning: 'Scanning', vat: 'VAT', cpr_skills: 'CPR / Skills',
  dispatch: 'Dispatch', supervisor_eavs: 'EAVS', guest_service: 'Guest Service', cleaning: 'Cleaning',
}

const CERT_DISPLAY: Record<string, string> = {
  ellis: 'Ellis & Associates', red_cross: 'American Red Cross',
  starguard: 'StarGuard Elite', ymca: 'YMCA', jeff_ellis: 'Jeff Ellis Management',
}

const RESPONDER_LABEL: Record<string, string> = {
  primary_rescuer: 'Primary rescuer', assist: 'Assisted', first_aid: 'Gave first aid',
  supervisor: 'Supervisor on scene', witness: 'Witness',
}

const INCIDENT_LABEL: Record<string, string> = {
  save: 'Save / rescue', assist: 'Assist', first_aid: 'First aid',
  medical_emergency: 'Medical emergency', guest_injury: 'Guest injury', other: 'Other',
}

const ADVISEMENT_LABEL: Record<string, string> = {
  medical_restriction: 'Medical restriction', duty_restriction: 'Duty restriction',
  written_advisement: 'Written advisement', accommodation: 'Accommodation',
  return_to_duty: 'Return to duty',
}

const STATUS_LABELS: Record<string, string> = {
  assigned: 'Assigned', acknowledged: 'Acknowledged', in_deck: 'In Deck',
  verified: 'Verified', escalated: 'Escalated',
}

export default async function LifeguardReportPage({ params }: { params: { id: string } }) {
  const profile = await requireUser()
  if (profile.role === 'lifeguard') redirect('/my-profile')
  if (!isManager(profile.role)) redirect(`/roster/${params.id}`)
  if (!profile.facility_id) return null

  const supabase = createClient()

  const [{ data: member }, { data: facility }] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('id', params.id).eq('facility_id', profile.facility_id).single(),
    supabase.from('facilities').select('name, timezone').eq('id', profile.facility_id).single(),
  ])

  if (!member) notFound()

  const [{ data: audits }, { data: remediations }, { data: certifications }] = await Promise.all([
    supabase
      .from('audits')
      .select('*')
      .eq('lifeguard_id', params.id)
      .in('status', ['completed', 'remediated', 'closed'])
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false }),
    supabase
      .from('remediation_tasks')
      .select('*')
      .eq('lifeguard_id', params.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('certifications')
      .select('*')
      .eq('user_id', params.id)
      .order('expiry', { ascending: false }),
  ])

  // Incidents this guard responded to, and any duty advisements on file.
  const [{ data: responderRows }, { data: advisements }] = await Promise.all([
    supabase
      .from('incident_responders')
      .select('role, incidents!incident_responders_incident_id_fkey(*)')
      .eq('user_id', params.id),
    supabase
      .from('staff_advisements')
      .select('*')
      .eq('user_id', params.id)
      .order('effective_from', { ascending: false }),
  ])

  const involvement = (responderRows ?? [])
    .map((r) => ({ role: r.role as string, incident: r.incidents as unknown as Incident | null }))
    .filter((r): r is { role: string; incident: Incident } =>
      Boolean(r.incident) && r.incident!.status !== 'draft')
    .sort((a, b) => +new Date(b.incident.occurred_at) - +new Date(a.incident.occurred_at))

  // Saves and assists read as a credential; everything else is incident history.
  const rescues = involvement.filter((r) => ['save', 'assist'].includes(r.incident.kind))
  const otherIncidents = involvement.filter((r) => !['save', 'assist'].includes(r.incident.kind))
  const allAdvisements = (advisements ?? []) as StaffAdvisement[]

  const { data: waterBodies } = await supabase
    .from('water_bodies').select('id, name').eq('facility_id', profile.facility_id)
  const waterBodyName = new Map((waterBodies ?? []).map((b) => [b.id as string, b.name as string]))

  const auditIds = (audits ?? []).map((a) => a.id)
  const { data: criteriaResults } = auditIds.length > 0
    ? await supabase.from('audit_criteria_results').select('*').in('audit_id', auditIds)
    : { data: [] }

  const allAudits = (audits ?? []) as Audit[]
  const allRemediations = (remediations ?? []) as RemediationTask[]
  const allCerts = (certifications ?? []) as Certification[]
  const allCriteria = (criteriaResults ?? []) as AuditCriterionResult[]

  const criteriaByAudit = allCriteria.reduce<Record<string, AuditCriterionResult[]>>((acc, r) => {
    if (!acc[r.audit_id]) acc[r.audit_id] = []
    acc[r.audit_id].push(r)
    return acc
  }, {})

  const lpr = computeLPR(allAudits)
  const totalAudits = allAudits.length
  const passCount = allAudits.filter((a) => a.passed).length
  const failCount = allAudits.filter((a) => a.passed === false).length
  const passRate = totalAudits > 0 ? Math.round((passCount / totalAudits) * 100) : 0

  const byType = Object.entries(AUDIT_DISPLAY).map(([key, label]) => {
    const typeAudits = allAudits.filter((a) => a.audit_type_name === key)
    const typePasses = typeAudits.filter((a) => a.passed).length
    return {
      key, label,
      total: typeAudits.length,
      passes: typePasses,
      rate: typeAudits.length > 0 ? Math.round((typePasses / typeAudits.length) * 100) : null,
    }
  }).filter((t) => t.total > 0)

  const failureCounts: Record<string, number> = {}
  allCriteria.filter((r) => r.result === 'fail').forEach((r) => {
    failureCounts[r.criterion_label] = (failureCounts[r.criterion_label] ?? 0) + 1
  })
  const topFailures = Object.entries(failureCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)

  const openRem = allRemediations.filter((r) => ['assigned', 'acknowledged', 'in_deck'].includes(r.status))
  const closedRem = allRemediations.filter((r) => ['verified', 'escalated'].includes(r.status))
  const now = new Date()

  // Render every date in the facility's own timezone. The server runs UTC, so
  // without this an 8pm Central event prints as the following day in a document
  // that calls itself an official record.
  const timeZone = facility?.timezone ?? 'America/Chicago'
  const fmtDate = (d: string | Date) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone })
  const fmtDateLong = (d: string | Date) =>
    new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone })

  const generatedAt = now.toLocaleString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short', timeZone,
  })
  const fileName = `${member.name.replace(/\s+/g, '_')}_Liability_Report_${now.toISOString().slice(0, 10)}.pdf`

  // Section numbers are derived from which sections actually render, so adding
  // or removing one can't silently misnumber the rest of an official document.
  const SECTIONS = [
    'summary',
    ...(topFailures.length > 0 ? ['failures'] : []),
    'certifications', 'remediation', 'audits', 'rescues', 'incidents', 'advisements',
  ] as const
  const no = (key: (typeof SECTIONS)[number]) =>
    String(SECTIONS.indexOf(key) + 1).padStart(2, '0')

  return (
    <div className="pc-report min-h-screen bg-gray-100 print:bg-white">
      {/* Toolbar — screen only */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-8 py-3 flex items-center justify-between">
        <Link href={`/roster/${params.id}`} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Profile
        </Link>
        <ReportActions fileName={fileName} />
      </div>

      {/* Report body */}
      <div className="max-w-4xl mx-auto px-8 py-8 print:px-0 print:py-0 print:max-w-none">
        <div id="report-content" className="bg-white rounded-2xl shadow-sm print:shadow-none print:rounded-none space-y-0 overflow-hidden">

          {/* ── Cover Header ── */}
          <div className="bg-gray-900 text-white px-10 py-8">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">PoolControl · Official Document</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">{member.name}</h1>
                <p className="text-gray-400 mt-1 capitalize text-sm">{member.role} · {member.email}</p>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  {member.employee_id && <span>ID: {member.employee_id}</span>}
                  {member.hire_date && (
                    <span>Hired: {fmtDateLong(member.hire_date)}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{facility?.name ?? 'Facility'}</p>
                <p className="text-xs text-gray-500 mt-1">Generated {generatedAt}</p>
                <p className="text-xs text-gray-500 mt-0.5">CONFIDENTIAL — Authorized Use Only</p>
                {lpr > 0 && (
                  <div className="mt-4 inline-block px-4 py-2 rounded-xl bg-white/10 border border-white/20">
                    <span className={`text-2xl font-bold ${lpr >= 4 ? 'text-emerald-400' : lpr >= 3 ? 'text-amber-400' : 'text-red-400'}`}>
                      {lpr.toFixed(1)}
                    </span>
                    <span className="text-gray-400 text-sm ml-1">/ 5.0 LPR</span>
                  </div>
                )}
              </div>
            </div>

            {/* Title bar */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <h2 className="text-lg font-semibold text-white">Lifeguard Liability & Performance Report</h2>
              <p className="text-gray-400 text-xs mt-0.5">
                Complete career record including audit history, remediation follow-ups, certification status, and performance analytics.
              </p>
            </div>
          </div>

          <div className="px-10 py-8 space-y-10">

            {/* ── Section 1: Performance Summary ── */}
            <section>
              <SectionHeader number={no('summary')} title="Performance Summary" />
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total Audits', value: totalAudits, color: 'text-gray-900' },
                  { label: 'Overall Pass Rate', value: `${passRate}%`, color: passRate >= 70 ? 'text-emerald-600' : 'text-red-500' },
                  { label: 'Audits Passed', value: passCount, color: 'text-emerald-600' },
                  { label: 'Audits Failed', value: failCount, color: failCount > 0 ? 'text-red-500' : 'text-gray-400' },
                ].map((s) => (
                  <div key={s.label} className="border border-gray-200 rounded-xl px-5 py-4 text-center bg-gray-50">
                    <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-gray-400 mt-1 font-medium uppercase tracking-wide">{s.label}</p>
                  </div>
                ))}
              </div>

              {byType.length > 0 && (
                <ProTable
                  headers={['Audit Type', 'Conducted', 'Passed', 'Failed', 'Pass Rate']}
                  rows={byType.map((t) => [
                    <span key="label" className="font-medium text-gray-900">{t.label}</span>,
                    t.total,
                    <span key="pass" className="text-emerald-600 font-medium">{t.passes}</span>,
                    <span key="fail" className={`font-medium ${t.total - t.passes > 0 ? 'text-red-500' : 'text-gray-400'}`}>{t.total - t.passes}</span>,
                    <span key="rate" className={`font-semibold ${t.rate !== null && t.rate < 70 ? 'text-red-500' : 'text-gray-700'}`}>
                      {t.rate !== null ? `${t.rate}%` : '—'}
                    </span>,
                  ])}
                  alignments={['left', 'center', 'center', 'center', 'center']}
                />
              )}
            </section>

            {/* ── Section 2: Recurring Failures ── */}
            {topFailures.length > 0 && (
              <section>
                <SectionHeader number={no('failures')} title="Recurring Failure Criteria" />
                <p className="text-xs text-gray-400 mb-4">Criteria this lifeguard has failed across all audits, ranked by frequency. Patterns here indicate systemic skill deficiencies.</p>
                <ProTable
                  headers={['Criterion', 'Times Failed', 'Risk Indicator']}
                  rows={topFailures.map(([label, count]) => [
                    <span key="label" className="text-gray-900">{label}</span>,
                    <span key="count" className="font-bold text-red-500">{count}</span>,
                    <span key="risk" className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${count >= 3 ? 'bg-red-100 text-red-600' : count >= 2 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                      {count >= 3 ? 'High' : count >= 2 ? 'Moderate' : 'Low'}
                    </span>,
                  ])}
                  alignments={['left', 'center', 'center']}
                />
              </section>
            )}

            {/* ── Section 3: Certifications ── */}
            <section>
              <SectionHeader number={no('certifications')} title="Certification Status" />
              {allCerts.length === 0 ? (
                <EmptyState message="No certifications on record." />
              ) : (
                <ProTable
                  headers={['Certifying Body', 'Certification ID', 'Date Issued', 'Expiration Date', 'Status']}
                  rows={allCerts.map((cert: Certification) => {
                    const expired = new Date(cert.expiry) < now
                    return [
                      <span key="body" className="font-medium text-gray-900">{CERT_DISPLAY[cert.body] ?? cert.body}</span>,
                      <span key="id" className="font-mono text-xs text-gray-600">PC-{cert.id.slice(0, 8).toUpperCase()}</span>,
                      fmtDate(cert.issued_at),
                      fmtDate(cert.expiry),
                      expired
                        ? <span key="status" className="inline-flex items-center gap-1 text-red-500 text-xs font-bold"><AlertTriangle className="w-3 h-3" /> EXPIRED</span>
                        : <span key="status" className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold"><CheckCircle className="w-3 h-3" /> Active</span>,
                    ]
                  })}
                  alignments={['left', 'left', 'left', 'left', 'center']}
                />
              )}
            </section>

            {/* ── Section 4: Remediation History ── */}
            <section>
              <SectionHeader
                number={no('remediation')}
                title="Remediation & Follow-Up History"
                badge={`${allRemediations.length} total · ${openRem.length} open · ${closedRem.length} resolved`}
              />
              {allRemediations.length === 0 ? (
                <EmptyState message="No remediation tasks on record." />
              ) : (
                <ProTable
                  headers={['Date Assigned', 'Deadline', 'Status', 'Coaching Notes']}
                  rows={allRemediations.map((task: RemediationTask) => {
                    const isOpen = ['assigned', 'acknowledged', 'in_deck'].includes(task.status)
                    const isOverdue = isOpen && new Date(task.deadline) < now
                    return [
                      fmtDate(task.created_at),
                      fmtDate(task.deadline),
                      <span key="status" className={`text-xs font-bold uppercase tracking-wide ${
                        isOverdue ? 'text-red-500' :
                        task.status === 'verified' ? 'text-emerald-600' :
                        task.status === 'escalated' ? 'text-orange-500' : 'text-amber-500'
                      }`}>
                        {isOverdue ? 'Overdue' : STATUS_LABELS[task.status] ?? task.status}
                      </span>,
                      <span key="notes" className="text-gray-500 text-xs">{task.coaching_notes ?? '—'}</span>,
                    ]
                  })}
                  alignments={['left', 'left', 'center', 'left']}
                />
              )}
            </section>

            {/* ── Section 5: Complete Audit History ── */}
            <section>
              <SectionHeader
                number={no('audits')}
                title="Complete Audit History"
                badge={`${totalAudits} audits on record`}
              />
              {totalAudits === 0 ? (
                <EmptyState message="No audit records found." />
              ) : (
                <ProTable
                  headers={['Date', 'Audit Type', 'Zone', 'Score', 'Result', 'Failed Criteria']}
                  rows={allAudits.map((audit: Audit) => {
                    const criteria = criteriaByAudit[audit.id] ?? []
                    const failed = criteria.filter((c) => c.result === 'fail').map((c) => c.criterion_label)
                    return [
                      <span key="date" className="text-xs whitespace-nowrap">
                        {audit.submitted_at ? fmtDate(audit.submitted_at) : '—'}
                      </span>,
                      <span key="type" className="font-medium text-gray-900">{AUDIT_DISPLAY[audit.audit_type_name] ?? audit.audit_type_name}</span>,
                      audit.zone ?? '—',
                      audit.score !== null ? `${Math.round((audit.score / 5) * 100)}%` : '—',
                      audit.passed === true ? (
                        <span key="result" className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold"><CheckCircle className="w-3 h-3" /> Pass</span>
                      ) : audit.passed === false ? (
                        <span key="result" className="inline-flex items-center gap-1 text-red-500 text-xs font-semibold"><XCircle className="w-3 h-3" /> Fail</span>
                      ) : (
                        <span key="result" className="text-gray-400 text-xs">Pending</span>
                      ),
                      <span key="failed" className="text-xs text-red-500">{failed.length > 0 ? failed.join(', ') : <span className="text-gray-300">—</span>}</span>,
                    ]
                  })}
                  alignments={['left', 'left', 'left', 'center', 'center', 'left']}
                />
              )}
            </section>

            {/* ── Sections 6–8: integration-fed records ── */}
            <section>
              <SectionHeader
                number={no('rescues')}
                title="Rescue & Save Log"
              />
              <p className="text-xs text-gray-400 mb-3">
                Documented in-water rescues, dry-land saves, and assists performed by this lifeguard.
              </p>
              {rescues.length === 0 ? (
                <EmptyState message="No rescues or assists on record for this lifeguard." />
              ) : (
                <ProTable
                  headers={['Date', 'Type', 'Location', 'Role', 'EMS', 'Outcome']}
                  alignments={['left', 'left', 'left', 'left', 'center', 'left']}
                  rows={rescues.map(({ role, incident }) => [
                    <span key="d" className="whitespace-nowrap">{fmtDate(incident.occurred_at)}</span>,
                    <span key="t" className="font-medium text-gray-900">{INCIDENT_LABEL[incident.kind] ?? incident.kind}</span>,
                    incident.water_body_id ? (waterBodyName.get(incident.water_body_id) ?? '—') : '—',
                    RESPONDER_LABEL[role] ?? role,
                    incident.ems_called ? 'Yes' : '—',
                    incident.outcome ?? '—',
                  ])}
                />
              )}
            </section>

            <section>
              <SectionHeader
                number={no('incidents')}
                title="Incident & Claim History"
              />
              <p className="text-xs text-gray-400 mb-3">
                Emergency medical situations, claims, and litigation events this lifeguard has been involved in, cross-referenced with audit and remediation records at the time of each event.
              </p>
              {otherIncidents.length === 0 ? (
                <EmptyState message="No incidents on record for this lifeguard." />
              ) : (
                <ProTable
                  headers={['Date', 'Type', 'Severity', 'Location', 'Role', 'Status']}
                  alignments={['left', 'left', 'center', 'left', 'left', 'center']}
                  rows={otherIncidents.map(({ role, incident }) => [
                    <span key="d" className="whitespace-nowrap">{fmtDate(incident.occurred_at)}</span>,
                    <span key="t" className="font-medium text-gray-900">{INCIDENT_LABEL[incident.kind] ?? incident.kind}</span>,
                    <span key="s" className={`capitalize ${incident.severity === 'severe' ? 'text-red-600 font-semibold' : ''}`}>{incident.severity}</span>,
                    incident.water_body_id ? (waterBodyName.get(incident.water_body_id) ?? '—') : '—',
                    RESPONDER_LABEL[role] ?? role,
                    <span key="st" className="capitalize">{incident.status.replace('_', ' ')}</span>,
                  ])}
                />
              )}
            </section>

            <section>
              <SectionHeader
                number={no('advisements')}
                title="Medical Restrictions & Official Advisements"
              />
              <p className="text-xs text-gray-400 mb-3">
                Physician-recognized restrictions and official advisements affecting duty assignment.
              </p>
              {allAdvisements.length === 0 ? (
                <EmptyState message="No restrictions or advisements on record." />
              ) : (
                <ProTable
                  headers={['Effective', 'Until', 'Type', 'Restriction', 'Issued by']}
                  alignments={['left', 'left', 'left', 'left', 'left']}
                  rows={allAdvisements.map((a) => [
                    <span key="f" className="whitespace-nowrap">{fmtDate(a.effective_from)}</span>,
                    a.effective_to ? fmtDate(a.effective_to) : 'Open-ended',
                    ADVISEMENT_LABEL[a.kind] ?? a.kind,
                    <span key="r" className="text-gray-900">{a.restriction}</span>,
                    a.issued_by ?? '—',
                  ])}
                />
              )}
            </section>

            {/* ── Liability Statement ── */}
            <section className="border-t border-gray-200 pt-8">
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-7 py-6">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-widest">Official Liability & Compliance Statement</h3>
                </div>
                <div className="space-y-3 text-xs text-gray-600 leading-relaxed">
                  <p>
                    This document constitutes an official performance and compliance record for the above-named aquatics staff member and has been generated by the PoolControl Aquatics Management Platform. All information contained herein — including audit scores, remediation history, certification status, failure patterns, and performance ratings — reflects data entered by authorized supervisory personnel at <strong className="text-gray-800">{facility?.name ?? 'this facility'}</strong> and has not been modified in transit.
                  </p>
                  <p>
                    This report is generated for use by authorized facility management, risk management personnel, legal counsel, insurance carriers, and regulatory authorities in connection with incident investigations, employment actions, compliance audits, or litigation proceedings. The Lifeguard Performance Rating (LPR) is a proprietary metric computed from audit pass rates and is intended as one component of a broader performance evaluation, not as a sole determinant of employment status.
                  </p>
                  <p>
                    Unauthorized disclosure, reproduction, or distribution of this document to parties not named above is strictly prohibited. All records reflected in this report must be retained in accordance with applicable federal, state, and local labor regulations and aquatic safety standards, including but not limited to standards set forth by the applicable certifying body.
                  </p>
                </div>
                <div className="mt-5 pt-4 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-xs text-gray-400">
                    <span className="font-semibold text-gray-600">Generated by PoolControl.ai</span>
                    {' · '}{generatedAt}
                  </div>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Authorized Personnel Only</div>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Shared layout components ─────────────────────────────────────────────────

function SectionHeader({ number, title, badge }: { number: string; title: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-gray-300 tabular-nums">{number}</span>
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">{title}</h2>
      </div>
      {badge && <span className="text-xs text-gray-400 font-medium">{badge}</span>}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-6 text-center border border-dashed border-gray-200 rounded-xl">
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  )
}

type CellValue = React.ReactNode

function ProTable({
  headers,
  rows,
  alignments,
}: {
  headers: string[]
  rows: CellValue[][]
  alignments: ('left' | 'center' | 'right')[]
}) {
  return (
    <div className="rounded-xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            {headers.map((h, i) => (
              <th
                key={h}
                className={`px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide text-${alignments[i]}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={`border-b border-gray-50 last:border-0 ${ri % 2 !== 0 ? 'bg-gray-50/50' : 'bg-white'}`}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-4 py-3 text-gray-600 text-${alignments[ci]}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
