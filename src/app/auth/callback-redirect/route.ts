import { createClient, createServiceClient } from '@/lib/supabase/server'
import { roleHomePage } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url)
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`)
  }

  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('role, is_first_login')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_profile`)
  }

  if (profile.is_first_login) {
    return NextResponse.redirect(`${origin}/welcome`)
  }

  return NextResponse.redirect(`${origin}${roleHomePage(profile.role)}`)
}
