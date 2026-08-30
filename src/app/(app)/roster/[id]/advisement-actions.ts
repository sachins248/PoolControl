'use server'

import { revalidatePath } from 'next/cache'
import { requireUserForAction, isManager } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { AdvisementKind } from '@/types'

/**
 * Duty restrictions and advisements. Manager/director only — deliberately
 * narrower than the rest of the app, because this is the closest thing the
 * product holds to sensitive staff data.
 *
 * Records the restriction, never the underlying condition. The form says so.
 */
export async function addAdvisement(input: {
  userId: string
  kind: AdvisementKind
  restriction: string
  issuedBy: string
  effectiveFrom: string
  effectiveTo: string
}): Promise<{ error?: string }> {
  const { profile } = await requireUserForAction()
  if (!isManager(profile.role) || !profile.facility_id) {
    return { error: 'Only a manager or director can record advisements.' }
  }
  if (!input.restriction.trim()) return { error: 'A restriction is required.' }
  if (!input.effectiveFrom) return { error: 'An effective-from date is required.' }

  const service = createServiceClient()

  // Confirm the subject is actually at this facility before writing.
  const { data: subject } = await service
    .from('user_profiles').select('facility_id').eq('id', input.userId).single()
  if (subject?.facility_id !== profile.facility_id) return { error: 'Unknown staff member.' }

  const { error } = await service.from('staff_advisements').insert({
    facility_id: profile.facility_id,
    user_id: input.userId,
    kind: input.kind,
    restriction: input.restriction.trim(),
    issued_by: input.issuedBy.trim() || null,
    effective_from: input.effectiveFrom,
    effective_to: input.effectiveTo || null,
    recorded_by_id: profile.id,
  })

  if (error) return { error: error.message }
  revalidatePath(`/roster/${input.userId}`)
  revalidatePath(`/roster/${input.userId}/report`)
  return {}
}

export async function deleteAdvisement(id: string, userId: string): Promise<{ error?: string }> {
  const { profile } = await requireUserForAction()
  if (!isManager(profile.role) || !profile.facility_id) return { error: 'Unauthorized' }

  const service = createServiceClient()
  const { error } = await service
    .from('staff_advisements')
    .delete()
    .eq('id', id)
    .eq('facility_id', profile.facility_id)

  if (error) return { error: error.message }
  revalidatePath(`/roster/${userId}`)
  revalidatePath(`/roster/${userId}/report`)
  return {}
}
