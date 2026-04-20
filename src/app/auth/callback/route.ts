import { createClient, createServiceClient } from '@/lib/supabase/server'
import { roleHomePage } from '@/lib/auth'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = createClient()
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && user) {
      // If a specific destination was requested (e.g. from middleware redirect), use it
      if (next && !next.startsWith('/auth')) {
        return NextResponse.redirect(`${origin}${next}`)
      }

      // After code exchange, session cookies are set on the response but the current
      // createClient() instance may not have them yet — use service client for this lookup
      const serviceClient = createServiceClient()
      const { data: profile } = await serviceClient
        .from('user_profiles')
        .select('role, is_first_login')
        .eq('id', user.id)
        .single()

      if (!profile) {
        // Auth user exists but no profile — shouldn't happen but handle gracefully
        return NextResponse.redirect(`${origin}/auth/login?error=no_profile`)
      }

      // New user — show welcome screen
      if (profile.is_first_login) {
        return NextResponse.redirect(`${origin}/welcome`)
      }

      return NextResponse.redirect(`${origin}${roleHomePage(profile.role)}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`)
}
