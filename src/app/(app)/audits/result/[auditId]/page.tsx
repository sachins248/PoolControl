import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { AuditResultClient } from './audit-result-client'

export default async function AuditResultPage({ params }: { params: { auditId: string } }) {
  const profile = await requireUser()
  const supabase = createClient()

  // RLS on audits ensures users only see audits they're allowed to see:
  // lifeguards see own, supervisors/directors see their facility
  const { data: audit } = await supabase
    .from('audits')
    .select(`*, audit_criteria_results(*)`)
    .eq('id', params.auditId)
    .single()

  if (!audit) notFound()

  const { data: lifeguard } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', audit.lifeguard_id)
    .single()

  const { data: auditType } = await supabase
    .from('audit_types')
    .select('*')
    .eq('id', audit.audit_type_id)
    .single()

  const { data: facility } = await supabase
    .from('facilities')
    .select('config, name')
    .eq('id', audit.facility_id)
    .single()

  const deadlineHours = (facility?.config as any)?.remediation_deadline_hours ?? 48

  const { data: remediationTask } = await supabase
    .from('remediation_tasks')
    .select('*')
    .eq('audit_id', params.auditId)
    .maybeSingle()

  const { data: hotSeatQueue } = await supabase
    .from('remediation_tasks')
    .select('id, lifeguard_id, deadline, status, created_at, user_profiles!lifeguard_id(name, avatar_color)')
    .eq('facility_id', audit.facility_id)
    .in('status', ['assigned', 'acknowledged', 'in_deck'])
    .order('deadline', { ascending: true })
    .limit(5)

  let coachingPoints: Array<{ title: string; description: string }> = []
  const failedCriteria = (audit.audit_criteria_results ?? []).filter(
    (r: any) => r.result === 'fail' || r.result === 'needs_attention'
  )

  if (failedCriteria.length > 0 && auditType) {
    try {
      // Pass session cookies so the API auth check succeeds (server-to-server call)
      const cookieHeader = cookies().getAll().map((c) => `${c.name}=${c.value}`).join('; ')
      const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/coach/coaching-points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
        body: JSON.stringify({
          failed_criteria: failedCriteria,
          audit_type: audit.audit_type_name,
          cert_body: auditType.cert_body,
          lifeguard_name: lifeguard?.name ?? 'the lifeguard',
          criteria_definitions: auditType.criteria,
        }),
      })
      if (response.ok) coachingPoints = await response.json()
    } catch {
      // not blocking
    }
  }

  return (
    <AuditResultClient
      audit={audit}
      lifeguard={lifeguard}
      auditType={auditType}
      facility={facility}
      deadlineHours={deadlineHours}
      remediationTask={remediationTask}
      hotSeatQueue={hotSeatQueue ?? []}
      coachingPoints={coachingPoints}
      supervisorId={profile.id}
    />
  )
}
