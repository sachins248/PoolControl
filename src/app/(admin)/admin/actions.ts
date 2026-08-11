'use server'

import { requireUserForAction, isSuperAdmin } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function assertSuperAdmin() {
  const { profile } = await requireUserForAction()
  if (!isSuperAdmin(profile.role)) throw new Error('Unauthorized')
}

export async function onboardFacility(
  facilityName: string,
  directorName: string,
  directorEmail: string,
) {
  await assertSuperAdmin()

  const service = createServiceClient()
  let facilityId: string | null = null
  let authUserId: string | null = null

  try {
    // 1. Create facility
    const { data: facility, error: facilityError } = await service
      .from('facilities')
      .insert({ name: facilityName.trim(), plan: 'trial', billing_status: 'active' })
      .select('id')
      .single()
    if (facilityError) throw new Error(facilityError.message)
    facilityId = facility.id

    // 2. Create auth user (email pre-confirmed — no verification needed)
    const { data: authData, error: authError } = await service.auth.admin.createUser({
      email: directorEmail.trim().toLowerCase(),
      email_confirm: true,
    })
    if (authError) throw new Error(authError.message)
    authUserId = authData.user.id

    // 3. Create director profile
    const { error: profileError } = await service.from('user_profiles').insert({
      id: authUserId,
      facility_id: facilityId,
      name: directorName.trim(),
      email: directorEmail.trim().toLowerCase(),
      role: 'director',
      is_first_login: true,
    })
    if (profileError) throw new Error(profileError.message)

    // 4. Send password setup email (cleaner than OTP since email is already confirmed)
    await service.auth.resetPasswordForEmail(directorEmail.trim().toLowerCase(), {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/reset-password?setup=true`,
    })
  } catch (err) {
    // Rollback: delete profile (cascades aren't guaranteed mid-transaction), auth user, facility
    if (authUserId) await service.auth.admin.deleteUser(authUserId).catch(() => null)
    if (facilityId) await Promise.resolve(service.from('facilities').delete().eq('id', facilityId)).catch(() => null)
    throw err
  }

  revalidatePath('/admin')
}

export async function updateFacilityBilling(
  facilityId: string,
  data: { plan: string; billing_status: string; trial_ends_at: string },
) {
  await assertSuperAdmin()

  const service = createServiceClient()
  const { error } = await service
    .from('facilities')
    .update({ plan: data.plan, billing_status: data.billing_status, trial_ends_at: data.trial_ends_at })
    .eq('id', facilityId)
  if (error) throw new Error(error.message)

  revalidatePath('/admin')
  revalidatePath(`/admin/facilities/${facilityId}`)
}

export async function suspendFacility(facilityId: string) {
  await assertSuperAdmin()

  const service = createServiceClient()

  // Sign out all active users immediately
  const { data: users } = await service
    .from('user_profiles')
    .select('id')
    .eq('facility_id', facilityId)
    .eq('is_active', true)

  for (const u of users ?? []) {
    await service.auth.admin.signOut(u.id, 'global').catch(() => null)
  }

  await service.from('facilities').update({ billing_status: 'suspended' }).eq('id', facilityId)

  revalidatePath('/admin')
  revalidatePath(`/admin/facilities/${facilityId}`)
}
