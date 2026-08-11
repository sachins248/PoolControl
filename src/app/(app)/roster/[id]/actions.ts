'use server'

import { revalidatePath } from 'next/cache'
import { createServiceClient } from '@/lib/supabase/server'
import { requireUser, isManager } from '@/lib/auth'
import type { AuditTypeName } from '@/types'

const VALID_TYPES: AuditTypeName[] = [
  'scanning', 'vat', 'cpr_skills', 'dispatch', 'supervisor_eavs', 'guest_service', 'cleaning',
]

/**
 * Save a per-lifeguard audit-frequency override. Managers only.
 * Pass null (or an empty object) to clear and fall back to the facility cadence.
 */
export async function saveCadenceOverride(
  lifeguardId: string,
  override: Partial<Record<AuditTypeName, number>> | null,
) {
  const profile = await requireUser()
  if (!isManager(profile.role) && profile.role !== 'super_admin') {
    return { error: 'Only managers can adjust audit frequency.' }
  }

  const supabase = createServiceClient()

  // Never trust the client-supplied ID — confirm the guard is in the caller's facility
  const { data: guard } = await supabase
    .from('user_profiles')
    .select('id, facility_id')
    .eq('id', lifeguardId)
    .single()

  if (!guard || guard.facility_id !== profile.facility_id) {
    return { error: 'Lifeguard not found.' }
  }

  // Sanitize: known types only, 1–365 days, integers
  let clean: Record<string, number> | null = null
  if (override) {
    clean = {}
    for (const [type, days] of Object.entries(override)) {
      if (!VALID_TYPES.includes(type as AuditTypeName)) continue
      const n = Math.round(Number(days))
      if (!Number.isFinite(n) || n < 1 || n > 365) continue
      clean[type] = n
    }
    if (Object.keys(clean).length === 0) clean = null
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({ audit_cadence_override: clean })
    .eq('id', lifeguardId)

  if (error) return { error: 'Failed to save: ' + error.message }

  revalidatePath(`/roster/${lifeguardId}`)
  revalidatePath('/schedule')
  return { error: null }
}
