'use client'

import '../auth.css'
import { Suspense } from 'react'
import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Mail } from 'lucide-react'

type Mode = 'login' | 'otp_request' | 'forgot' | 'forgot_sent'

function LoginContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode] = useState<Mode>(
    searchParams.get('mode') === 'forgot' ? 'forgot' : 'login'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      setLoading(false)
      setError('Incorrect email or password.')
      return
    }

    // Fetch profile before navigating — this proves the session cookie is live
    // and avoids a race condition where window.location fires before cookies are written
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, is_first_login')
      .eq('id', data.user.id)
      .single()

    if (!profile) {
      setLoading(false)
      setError('Account setup incomplete. Contact your facility director.')
      return
    }

    const roleMap: Record<string, string> = {
      lifeguard: '/my-profile',
      supervisor: '/schedule',
      manager: '/schedule',
      director: '/schedule',
      corporate: '/dashboard',
      super_admin: '/admin',
    }

    router.push(profile.is_first_login ? '/welcome' : (roleMap[profile.role] ?? '/schedule'))
  }

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })

    setLoading(false)
    if (error) {
      setError(error.message.includes('not found') || error.message.includes('not exist')
        ? 'No account found with this email. Contact your facility director.'
        : error.message)
      return
    }

    router.push(`/auth/verify-otp?email=${encodeURIComponent(email)}`)
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    setLoading(false)
    if (error) { setError(error.message); return }
    setMode('forgot_sent')
  }

  return (
    <div className="dp-auth">
      <div className="dp-auth-inner">

        {/* Brand */}
        <div className="dp-auth-brand">
          <img src="/logo.jpeg" alt="PoolControl.ai" className="dp-auth-logo" />
          <span className="dp-auth-name">POOLCONTROL<i>.AI</i></span>
        </div>

        {/* Card */}
        <div className="dp-auth-card">
          <span className="dp-auth-tick dp-auth-tick-tl" aria-hidden="true" />
          <span className="dp-auth-tick dp-auth-tick-tr" aria-hidden="true" />
          <span className="dp-auth-tick dp-auth-tick-bl" aria-hidden="true" />
          <span className="dp-auth-tick dp-auth-tick-br" aria-hidden="true" />

          {/* ── Login mode ── */}
          {mode === 'login' && (
            <>
              <h1 className="dp-auth-title">Sign in<i>.</i></h1>
              <p className="dp-auth-sub">Welcome back. Enter your credentials to continue.</p>

              <form onSubmit={handleLogin}>
                <div className="dp-auth-field">
                  <label className="dp-auth-label">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@facility.com"
                    required
                    autoFocus
                    autoComplete="email"
                    className="dp-auth-input"
                  />
                </div>

                <div className="dp-auth-field">
                  <div className="dp-auth-row">
                    <label className="dp-auth-label">Password</label>
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(null) }}
                      className="dp-auth-link"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="dp-auth-input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="dp-auth-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="dp-auth-eye"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && <p className="dp-auth-error">{error}</p>}

                <button type="submit" disabled={loading} className="dp-auth-btn">
                  {loading ? 'Signing in…' : 'Sign in'}<span aria-hidden="true">→</span>
                </button>
              </form>

              <div className="dp-auth-divider">or</div>

              <button
                onClick={() => { setMode('otp_request'); setError(null) }}
                className="dp-auth-btn dp-auth-btn-line"
              >
                Sign in with a one-time code
              </button>
            </>
          )}

          {/* ── OTP request mode ── */}
          {mode === 'otp_request' && (
            <>
              <button
                onClick={() => { setMode('login'); setError(null) }}
                className="dp-auth-link"
                style={{ marginBottom: 18, display: 'block' }}
              >
                ← Back to sign in
              </button>
              <h1 className="dp-auth-title">Sign in with a code<i>.</i></h1>
              <p className="dp-auth-sub">
                We&apos;ll send a 6-digit code to your email. No password needed.
              </p>
              <form onSubmit={handleSendOTP}>
                <div className="dp-auth-field">
                  <label className="dp-auth-label">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@facility.com"
                    required
                    autoFocus
                    autoComplete="email"
                    className="dp-auth-input"
                  />
                </div>
                {error && <p className="dp-auth-error">{error}</p>}
                <button type="submit" disabled={loading} className="dp-auth-btn">
                  {loading ? 'Sending…' : 'Send code'}<span aria-hidden="true">→</span>
                </button>
              </form>
            </>
          )}

          {/* ── Forgot mode ── */}
          {mode === 'forgot' && (
            <>
              <button
                onClick={() => { setMode('login'); setError(null) }}
                className="dp-auth-link"
                style={{ marginBottom: 18, display: 'block' }}
              >
                ← Back to sign in
              </button>
              <h1 className="dp-auth-title">Reset your password<i>.</i></h1>
              <p className="dp-auth-sub">Enter the email address associated with your account.</p>
              <form onSubmit={handleForgotPassword}>
                <div className="dp-auth-field">
                  <label className="dp-auth-label">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@facility.com"
                    required
                    autoFocus
                    autoComplete="email"
                    className="dp-auth-input"
                  />
                </div>
                {error && <p className="dp-auth-error">{error}</p>}
                <button type="submit" disabled={loading} className="dp-auth-btn">
                  {loading ? 'Sending…' : 'Send reset link'}<span aria-hidden="true">→</span>
                </button>
              </form>
            </>
          )}

          {/* ── Forgot sent mode ── */}
          {mode === 'forgot_sent' && (
            <div style={{ textAlign: 'center' }}>
              <div className="dp-auth-glyph">
                <Mail className="w-5 h-5" />
              </div>
              <h1 className="dp-auth-title">Check your email<i>.</i></h1>
              <p className="dp-auth-sub" style={{ marginBottom: 14 }}>
                We sent a password reset link to <strong>{email}</strong>.
              </p>
              <p className="dp-auth-sub" style={{ marginBottom: 18 }}>
                Didn&apos;t receive it?{' '}
                <button onClick={() => setMode('forgot')} className="dp-auth-link dp-auth-link-strong">
                  Try again
                </button>
                {' '}or check your spam folder.
              </p>
              <button
                onClick={() => { setMode('login'); setError(null) }}
                className="dp-auth-link"
              >
                Back to sign in
              </button>
            </div>
          )}
        </div>

        <p className="dp-auth-foot">
          Invitation only · Contact your facility director for access
        </p>
        <p className="dp-auth-foot" style={{ marginTop: 10, opacity: 0.35 }}>
          <a href="/legal/terms" style={{ color: 'inherit' }}>Terms</a>
          {' · '}
          <a href="/legal/privacy" style={{ color: 'inherit' }}>Privacy</a>
          {' · '}
          <a href="/legal/ai" style={{ color: 'inherit' }}>AI &amp; Data</a>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginContent /></Suspense>
}
