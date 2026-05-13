'use server'

import { revalidatePath } from 'next/cache'
import { requireUserForAction, isManager } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

export async function addStaffMember(formData: FormData) {
  const { profile } = await requireUserForAction()
  if (!isManager(profile.role) || !profile.facility_id) {
    throw new Error('Unauthorized')
  }

  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const role = formData.get('role') as string
  const hire_date = formData.get('hire_date') as string | null

  if (!name || !email || !role) throw new Error('Missing required fields')
  if (!['lifeguard', 'supervisor', 'manager'].includes(role)) throw new Error('Invalid role')

  const serviceClient = createServiceClient()

  // Create auth user with email_confirm so they can set their own password via reset link
  const { data: newUser, error: createError } = await serviceClient.auth.admin.createUser({
    email,
    email_confirm: true,
  })

  if (createError) {
    if (createError.message?.includes('already been registered')) {
      throw new Error('A user with this email already exists.')
    }
    throw new Error(createError.message)
  }

  // Insert user profile
  const { error: profileError } = await serviceClient.from('user_profiles').insert({
    id: newUser.user.id,
    name,
    email,
    role,
    facility_id: profile.facility_id,
    hire_date: hire_date || null,
    is_first_login: true,
  })

  if (profileError) {
    await serviceClient.auth.admin.deleteUser(newUser.user.id)
    throw new Error(profileError.message)
  }

  // Send OTP code so new user can log in without a link
  const { createClient: createAnonClient } = await import('@supabase/supabase-js')
  const anonClient = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  await anonClient.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  })

  revalidatePath('/settings')
}

export async function saveWebhookSettings(slackUrl: string, teamsUrl: string) {
  const { profile } = await requireUserForAction()
  if (!isManager(profile.role) || !profile.facility_id) throw new Error('Unauthorized')

  const serviceClient = createServiceClient()

  const { data: facility } = await serviceClient
    .from('facilities')
    .select('config')
    .eq('id', profile.facility_id)
    .single()

  const existingConfig = (facility?.config ?? {}) as Record<string, unknown>

  const { error } = await serviceClient
    .from('facilities')
    .update({
      config: {
        ...existingConfig,
        slack_webhook_url: slackUrl.trim() || null,
        teams_webhook_url: teamsUrl.trim() || null,
      },
    })
    .eq('id', profile.facility_id)

  if (error) throw new Error(error.message)

  revalidatePath('/settings')
}

export async function removeStaffMember(userId: string) {
  const { profile } = await requireUserForAction()
  if (!isManager(profile.role) || !profile.facility_id) {
    throw new Error('Unauthorized')
  }
  if (userId === profile.id) throw new Error('Cannot remove yourself')

  const serviceClient = createServiceClient()

  // Verify target user belongs to same facility
  const { data: target } = await serviceClient
    .from('user_profiles')
    .select('facility_id')
    .eq('id', userId)
    .single()

  if (!target || target.facility_id !== profile.facility_id) {
    throw new Error('User not found in your facility')
  }

  // Mark inactive in profiles — preserves all audit history and FK integrity
  // Hard deletion would orphan audit records (lifeguard_id FK has no CASCADE)
  const { error: profileError } = await serviceClient
    .from('user_profiles')
    .update({ is_active: false })
    .eq('id', userId)

  if (profileError) throw new Error(profileError.message)

  // Kill active session immediately
  await serviceClient.auth.admin.signOut(userId, 'global')

  // Ban from auth: prevents any future logins
  const { error: banError } = await serviceClient.auth.admin.updateUserById(userId, {
    ban_duration: '876000h', // ~100 years = permanent
  })

  if (banError) throw new Error(banError.message)

  revalidatePath('/settings')
}
