import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { UserProfile } from '@/types'

/**
 * Get the authenticated user's profile from user_profiles.
 * Uses the session-scoped client so RLS applies.
 * Returns null if not authenticated or profile not found.
 */
export async function getServerUser(): Promise<UserProfile | null> {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return null

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) return null
    return profile as UserProfile
  } catch {
    return null
  }
}

/**
 * Same as getServerUser() but redirects to /auth/login if not authenticated.
 * Use this in every protected server component.
 */
export async function requireUser(): Promise<UserProfile> {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect('/auth/login')
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!profile) {
      // Auth session exists but no profile — sign out to break redirect loop
      await supabase.auth.signOut()
      redirect('/auth/login?error=no_profile')
    }

    return profile as UserProfile
  } catch (err: any) {
    // Don't catch redirect() — it throws internally
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err
    redirect('/auth/login')
  }
}

/**
 * Validate session from a Server Action or API route.
 * Returns { user, profile } or throws a 401 Response.
 */
export async function requireUserForAction(): Promise<{ profile: UserProfile }> {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) throw new Error('Profile not found')
    return { profile: profile as UserProfile }
  } catch {
    throw new Error('Unauthorized')
  }
}

/**
 * Map a role to its default landing page after login.
 */
export function roleHomePage(role: string): string {
  const map: Record<string, string> = {
    lifeguard: '/my-profile',
    supervisor: '/schedule',
    manager: '/schedule',
    director: '/schedule',
    corporate: '/dashboard',
  }
  return map[role] ?? '/schedule'
}

/** Returns true for manager role (and legacy director). */
export function isManager(role: string): boolean {
  return role === 'manager' || role === 'director'
}
