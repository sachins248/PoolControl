'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'

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
  facilityId: string,
  lifeguardId: string,
) {
  const profile = await requireUser()
  const supabase = createServiceClient()

  // Insert criteria results
  const { error: criteriaError } = await supabase
    .from('audit_criteria_results')
    .insert(criteriaResults)

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

  return { error: null }
}
