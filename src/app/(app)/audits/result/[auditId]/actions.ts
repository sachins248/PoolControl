'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth'

export async function assignRemediationTask(
  auditId: string,
  facilityId: string,
  lifeguardId: string,
  deadlineHours: number,
  coachingNotes: string,
) {
  const profile = await requireUser()
  const supabase = createServiceClient()

  const deadlineDate = new Date(Date.now() + deadlineHours * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('remediation_tasks')
    .insert({
      audit_id: auditId,
      facility_id: facilityId,
      lifeguard_id: lifeguardId,
      assigned_by_id: profile.id,
      deadline: deadlineDate,
      coaching_notes: coachingNotes,
    })
    .select('*')
    .single()

  if (error) {
    return { data: null, error: 'Failed to assign remediation task: ' + error.message }
  }

  // Update audit status to remediated — service client bypasses RLS recursion
  await supabase
    .from('audits')
    .update({ status: 'remediated' })
    .eq('id', auditId)

  return { data, error: null }
}
