'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'
import { sendAuditFailureWebhooks } from '@/lib/webhooks'

interface CriteriaResult {
  audit_id: string
  criterion_id: string
  criterion_label: string
  result: 'pass' | 'needs_attention' | 'fail'
  comment: string | null
}

export async function submitAudit(
  auditId: string,
  score: number,
  passed: boolean,
  criteriaResults: CriteriaResult[],
  notes?: string,
) {
  const profile = await requireUser()
  const supabase = createServiceClient()

  // Verify the audit belongs to the caller's facility — never trust client-supplied IDs
  const { data: auditRecord } = await supabase
    .from('audits')
    .select('facility_id, lifeguard_id, zone, audit_type_name')
    .eq('id', auditId)
    .single()

  if (!auditRecord || auditRecord.facility_id !== profile.facility_id) {
    return { error: 'Forbidden' }
  }

  const { facility_id: facilityId, lifeguard_id: lifeguardId } = auditRecord

  // Override audit_id on every criteria result — never trust the client-supplied value
  const safeResults = criteriaResults.map((r) => ({ ...r, audit_id: auditId }))

  // Delete any orphaned criteria from a previous failed submit attempt before inserting.
  // This can only exist if a prior submit inserted criteria but then failed to update the
  // audit status. The delete makes submitAudit safe to retry without creating duplicates.
  await supabase.from('audit_criteria_results').delete().eq('audit_id', auditId)

  const { error: criteriaError } = await supabase
    .from('audit_criteria_results')
    .insert(safeResults)

  if (criteriaError) {
    return { error: 'Failed to save criteria results: ' + criteriaError.message }
  }

  // Update audit to completed — uses service client to bypass RLS recursion
  const { error: auditError } = await supabase
    .from('audits')
    .update({
      status: 'completed',
      score,
      passed,
      notes: notes || null,
      submitted_at: new Date().toISOString(),
    })
    .eq('id', auditId)

  if (auditError) {
    return { error: 'Failed to complete audit: ' + auditError.message }
  }

  // Log action (best effort — non-blocking)
  try {
    await supabase.from('audit_log').insert({
      facility_id: facilityId,
      user_id: profile.id,
      action: 'audit_submitted',
      entity_type: 'audit',
      entity_id: auditId,
      metadata: { score, passed, lifeguard_id: lifeguardId },
    })
  } catch { /* non-critical */ }

  // Fire Slack/Teams webhook if audit failed (non-blocking)
  if (!passed) {
    try {
      const [{ data: facilityData }, { data: guardData }, { data: auditData }] = await Promise.all([
        supabase.from('facilities').select('name, config').eq('id', facilityId).single(),
        supabase.from('user_profiles').select('name').eq('id', lifeguardId).single(),
        supabase.from('audits').select('zone, audit_type_name').eq('id', auditId).single(),
      ])

      const config = (facilityData?.config ?? {}) as Record<string, string>
      const hasWebhook = config.slack_webhook_url || config.teams_webhook_url

      if (hasWebhook) {
        const failedCriteria = criteriaResults
          .filter((r) => r.result === 'fail')
          .map((r) => r.criterion_label)

        await sendAuditFailureWebhooks(
          { slack: config.slack_webhook_url, teams: config.teams_webhook_url },
          {
            lifeguardName: guardData?.name ?? 'Unknown',
            auditTypeName: auditData?.audit_type_name ?? 'Audit',
            zone: auditData?.zone ?? 'Unknown Zone',
            score,
            failedCriteria,
            auditId,
            facilityName: facilityData?.name ?? 'Your Facility',
          },
        )
      }
    } catch { /* non-critical — never block audit submission */ }
  }

  return { error: null }
}
