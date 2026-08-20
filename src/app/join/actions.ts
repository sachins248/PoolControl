'use server'

// These are the only two actions in the app with no authenticated session —
// by design, since this is how a new user gets an account in the first place.
// Don't mistake the missing requireUserForAction() guard for an oversight.

import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { normalizeJoinCode } from '@/lib/join-code'
import { checkLimit, joinLookupRatelimit, joinRegisterRatelimit } from '@/lib/rate-limit'

function callerIp(): string {
  const h = headers()
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? 'unknown'
}

async function findFacilityByCode(service: ReturnType<typeof createServiceClient>, code: string) {
  const { data: facility } = await service
    .from('facilities')
    .select('id, name, billing_status, lifeguard_join_code, supervisor_join_code')
    .or(`lifeguard_join_code.eq.${code},supervisor_join_code.eq.${code}`)
    .maybeSingle()

  if (!facility) throw new Error('Invalid code. Check with your facility manager.')
  if (facility.billing_status === 'suspended') {
    throw new Error('This facility account is currently inactive. Contact your facility manager.')
  }

  const role = facility.lifeguard_join_code === code ? 'lifeguard' : 'supervisor'
  return { facilityId: facility.id as string, facilityName: facility.name as string, role: role as 'lifeguard' | 'supervisor' }
}

export async function lookupJoinCode(rawCode: string) {
  const { success } = await checkLimit(joinLookupRatelimit, callerIp())
  if (!success) throw new Error('Too many attempts. Try again in a few minutes.')

  const code = normalizeJoinCode(rawCode)
  if (!code) throw new Error('Enter a code')

  const service = createServiceClient()
  return findFacilityByCode(service, code)
}

export async function registerViaJoinCode(input: { code: string; name: string; email: string }) {
  const { success } = await checkLimit(joinRegisterRatelimit, callerIp())
  if (!success) throw new Error('Too many attempts. Try again in a few minutes.')

  const code = normalizeJoinCode(input.code)
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()
  if (!code || !name || !email) throw new Error('Missing required fields')

  const service = createServiceClient()

  // Re-validate the code server-side — never trust facilityId/role held on the
  // client from the earlier lookup step.
  const { facilityId, role } = await findFacilityByCode(service, code)

  const { data: newUser, error: createError } = await service.auth.admin.createUser({
    email,
    email_confirm: true,
  })
  if (createError) {
    if (createError.message?.includes('already been registered')) {
      throw new Error('An account with this email already exists. Try signing in instead.')
    }
    throw new Error(createError.message)
  }

  const { error: profileError } = await service.from('user_profiles').insert({
    id: newUser.user.id,
    facility_id: facilityId,
    name,
    email,
    role,
    is_first_login: true,
  })
  if (profileError) {
    await service.auth.admin.deleteUser(newUser.user.id).catch(() => null)
    throw new Error(profileError.message)
  }

  // Same "OTP waiting for them" pattern as addStaffMember — anon client, not service.
  const { createClient: createAnonClient } = await import('@supabase/supabase-js')
  const anonClient = createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  await anonClient.auth.signInWithOtp({ email, options: { shouldCreateUser: false } })

  return { email }
}
