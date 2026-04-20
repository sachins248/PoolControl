import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NewAuditClient } from './new-audit-client'
import type { AuditType, UserProfile } from '@/types'

export default async function NewAuditPage({
  searchParams,
}: {
  searchParams: { lifeguardId?: string; auditType?: string }
}) {
  const profile = await requireUser()
  if (!profile.facility_id) return null
  // Only supervisors and directors can conduct audits
  if (profile.role === 'lifeguard') {
    const { redirect } = await import('next/navigation')
    redirect('/my-profile')
  }

  const supabase = createClient()

  const { data: facility } = await supabase
    .from('facilities')
    .select('cert_body, config')
    .eq('id', profile.facility_id)
    .single()

  const { data: auditTypes } = await supabase
    .from('audit_types')
    .select('*')
    .eq('cert_body', facility?.cert_body ?? 'ellis')

  const { data: lifeguards } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('facility_id', profile.facility_id)
    .eq('role', 'lifeguard')
    .order('name')

  const now = new Date()
  const cadence = (facility?.config as any)?.audit_cadence ?? {}

  const { data: recentAudits } = await supabase
    .from('audits')
    .select('lifeguard_id, audit_type_name, submitted_at')
    .eq('facility_id', profile.facility_id)
    .in('status', ['completed', 'remediated', 'closed'])
    .order('submitted_at', { ascending: false })

  const lastAudit: Record<string, Record<string, string>> = {}
  for (const audit of recentAudits ?? []) {
    if (!lastAudit[audit.audit_type_name]) lastAudit[audit.audit_type_name] = {}
    if (!lastAudit[audit.audit_type_name][audit.lifeguard_id]) {
      lastAudit[audit.audit_type_name][audit.lifeguard_id] = audit.submitted_at
    }
  }

  const dueLookup: Record<string, string[]> = {}
  for (const at of auditTypes ?? []) {
    const days = cadence[at.name] ?? 30
    dueLookup[at.name] = (lifeguards ?? [])
      .filter((lg) => {
        const last = lastAudit[at.name]?.[lg.id]
        if (!last) return true
        const daysAgo = (now.getTime() - new Date(last).getTime()) / (1000 * 60 * 60 * 24)
        return daysAgo >= days - 1
      })
      .map((lg) => lg.id)
  }

  const zones: string[] = (facility?.config as any)?.zones ?? ['Main Pool', 'Wave Pool', 'Lazy River', 'Activity Pool', 'Kiddie Pool']

  return (
    <NewAuditClient
      auditTypes={(auditTypes ?? []) as AuditType[]}
      lifeguards={(lifeguards ?? []) as UserProfile[]}
      dueLookup={dueLookup}
      zones={zones}
      supervisorId={profile.id}
      facilityId={profile.facility_id}
      supervisorRole={profile.role}
      preselectedLifeguardId={searchParams.lifeguardId}
      preselectedAuditType={searchParams.auditType}
    />
  )
}
