'use server'

import { revalidatePath } from 'next/cache'
import { requireUserForAction, isManager } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { LiabilityModel } from '@/types'

/**
 * Stores the facility's own actuarial inputs for the liability projection.
 * There is deliberately no default: until a facility enters figures it can
 * defend, the panel shows no dollar amounts at all.
 */
export async function saveLiabilityModel(input: {
  avgClaimCost: number
  claimProbabilityReduction: number
  source: string
}): Promise<{ error?: string }> {
  const { profile } = await requireUserForAction()
  if (!isManager(profile.role) || !profile.facility_id) {
    return { error: 'Only a manager or director can set the liability model.' }
  }

  const cost = Math.round(input.avgClaimCost)
  const reduction = input.claimProbabilityReduction

  if (!Number.isFinite(cost) || cost <= 0) {
    return { error: 'Average claim cost must be a positive number.' }
  }
  if (!Number.isFinite(reduction) || reduction <= 0 || reduction > 1) {
    return { error: 'Claim-probability reduction must be between 0 and 100%.' }
  }

  const service = createServiceClient()

  const { data: facility } = await service
    .from('facilities')
    .select('config')
    .eq('id', profile.facility_id)
    .single()

  const existingConfig = (facility?.config ?? {}) as Record<string, unknown>

  const model: LiabilityModel = {
    avg_claim_cost: cost,
    claim_probability_reduction: reduction,
    source: input.source.trim() || undefined,
    updated_at: new Date().toISOString(),
    updated_by_name: profile.name,
  }

  const { error } = await service
    .from('facilities')
    .update({ config: { ...existingConfig, liability_model: model } })
    .eq('id', profile.facility_id)

  if (error) return { error: error.message }

  revalidatePath('/analytics')
  return {}
}

export async function clearLiabilityModel(): Promise<{ error?: string }> {
  const { profile } = await requireUserForAction()
  if (!isManager(profile.role) || !profile.facility_id) {
    return { error: 'Only a manager or director can change the liability model.' }
  }

  const service = createServiceClient()
  const { data: facility } = await service
    .from('facilities')
    .select('config')
    .eq('id', profile.facility_id)
    .single()

  const config = { ...((facility?.config ?? {}) as Record<string, unknown>) }
  delete config.liability_model

  const { error } = await service
    .from('facilities')
    .update({ config })
    .eq('id', profile.facility_id)

  if (error) return { error: error.message }

  revalidatePath('/analytics')
  return {}
}
