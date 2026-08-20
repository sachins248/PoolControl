import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Must use getUser() not getSession() — validates JWT against Supabase auth server
  // and refreshes the session cookie if needed
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isAuthRoute = pathname.startsWith('/auth')
  const isJoinRoute = pathname.startsWith('/join')
  const isApiRoute = pathname.startsWith('/api')
  const isLegalRoute = pathname.startsWith('/legal')
  const isLandingPage = pathname === '/'

  // Unauthenticated user trying to access a protected route
  if (!user && !isAuthRoute && !isJoinRoute && !isApiRoute && !isLegalRoute && !isLandingPage) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Trial expiry enforcement — redirect expired trial facilities to /billing
  const isBillingRoute = pathname === '/billing'
  const isPublicRoute = isAuthRoute || isJoinRoute || isApiRoute || isBillingRoute || isLegalRoute || isLandingPage
  if (user && !isPublicRoute) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('facility_id, role')
      .eq('id', user.id)
      .single()

    // Super admins manage the platform itself — never gate them on a facility's trial clock
    if (profile?.facility_id && profile.role !== 'super_admin') {
      const { data: facility } = await supabase
        .from('facilities')
        .select('plan, trial_ends_at')
        .eq('id', profile.facility_id)
        .single()

      if (
        facility?.plan === 'trial' &&
        facility.trial_ends_at &&
        new Date(facility.trial_ends_at) < new Date()
      ) {
        return NextResponse.redirect(new URL('/billing', request.url))
      }
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
