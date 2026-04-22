'use server'

import { revalidatePath } from 'next/cache'
import { requireUserForAction } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'

export async function addStaffMember(formData: FormData) {
  const { profile } = await requireUserForAction()
  if (profile.role !== 'director' || !profile.facility_id) {
    throw new Error('Unauthorized')
  }

  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const role = formData.get('role') as string
  const hire_date = formData.get('hire_date') as string | null

  if (!name || !email || !role) throw new Error('Missing required fields')
  if (!['lifeguard', 'supervisor', 'director'].includes(role)) throw new Error('Invalid role')

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

export async function removeStaffMember(userId: string) {
  const { profile } = await requireUserForAction()
  if (profile.role !== 'director' || !profile.facility_id) {
    throw new Error('Unauthorized')
  }
  if (userId === profile.id) throw new Error('Cannot remove yourself')

  const serviceClient = createServiceClient()

  // Verify target user belongs to same facility before deleting
  const { data: target } = await serviceClient
    .from('user_profiles')
    .select('facility_id')
    .eq('id', userId)
    .single()

  if (!target || target.facility_id !== profile.facility_id) {
    throw new Error('User not found in your facility')
  }

  const { error } = await serviceClient.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)

  revalidatePath('/settings')
}
