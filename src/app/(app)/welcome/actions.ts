'use server'

import { requireUserForAction } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function roleHomePage(role: string): string {
  if (role === 'lifeguard') return '/my-profile'
  if (role === 'corporate') return '/dashboard'
  return '/schedule'
}

export async function markFirstLoginComplete() {
  const { profile } = await requireUserForAction()
  const supabase = createClient()

  await supabase
    .from('user_profiles')
    .update({ is_first_login: false })
    .eq('id', profile.id)

  redirect(roleHomePage(profile.role))
}
