import { notFound } from 'next/navigation'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { AuditResultClient } from './audit-result-client'

export default async function AuditResultPage({ params }: { params: { auditId: string } }) {
  await requireUser()
  const supabase = createClient()

  const { data: audit } = await supabase
    .from('audits')
    .select(`*, audit_criteria_results(*)`)
    .eq('id', params.auditId)
    .single()

  if (!audit) notFound()

  const [
    { data: lifeguard },
    { data: auditType },
    { data: facility },
    { data: remediationTask },
    { data: hotSeatQueue },
  ] = await Promise.all([
    supabase.from('user_profiles').select('*').eq('id', audit.lifeguard_id).single(),
    supabase.from('audit_types').select('*').eq('id', audit.audit_type_id).single(),
    supabase.from('facilities').select('config, name').eq('id', audit.facility_id).single(),
    supabase.from('remediation_tasks').select('*').eq('audit_id', params.auditId).maybeSingle(),
    supabase
      .from('remediation_tasks')
      .select('id, lifeguard_id, deadline, status, created_at, user_profiles!lifeguard_id(name, avatar_color)')
      .eq('facility_id', audit.facility_id)
      .in('status', ['assigned', 'acknowledged', 'in_deck'])
      .order('deadline', { ascending: true })
      .limit(5),
  ])

  const deadlineHours = (facility?.config as any)?.remediation_deadline_hours ?? 48

  return (
    <AuditResultClient
      audit={audit}
      lifeguard={lifeguard}
      auditType={auditType}
      facility={facility}
      deadlineHours={deadlineHours}
      remediationTask={remediationTask}
      hotSeatQueue={hotSeatQueue ?? []}
    />
  )
}
