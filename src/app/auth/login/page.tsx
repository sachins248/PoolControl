'use client'

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
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f1e2e] to-[#0a1f1a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.jpeg" alt="PoolControl.ai" className="w-14 h-14 rounded-2xl object-cover shadow-lg mb-4" />
          <h1 className="text-2xl font-bold text-white tracking-tight">PoolControl.ai</h1>
          <p className="text-white/40 text-sm mt-1">Aquatics Performance Platform</p>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

        {/* Card */}
        <div className="bg-white/[0.06] border border-white/[0.1] rounded-2xl p-7 backdrop-blur-sm shadow-2xl">

          {/* ── Login mode ── */}
          {mode === 'login' && (
            <>
              <h2 className="text-xl font-semibold text-white mb-1">Sign in to your account</h2>
              <p className="text-white/40 text-sm mb-6">Restricted access — invitation only.</p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@facility.com"
                    required
                    autoFocus
                    autoComplete="email"
                    className="w-full px-3.5 py-2.5 bg-white/[0.07] border border-white/[0.12] rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-white/60">Password</label>
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(null) }}
                      className="text-xs text-white/40 hover:text-emerald-400 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                      className="w-full px-3.5 py-2.5 bg-white/[0.07] border border-white/[0.12] rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors shadow-lg shadow-emerald-500/30 active:scale-[0.98]"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

              {/* OTP divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-white/[0.08]" />
                <span className="text-white/25 text-xs">or</span>
                <div className="flex-1 h-px bg-white/[0.08]" />
              </div>

              <button
                onClick={() => { setMode('otp_request'); setError(null) }}
                className="w-full py-2.5 border border-white/[0.12] rounded-lg text-white/60 hover:text-white hover:border-white/25 text-sm font-medium transition-all"
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
                className="text-white/40 hover:text-white/70 text-xs mb-5 transition-colors flex items-center gap-1"
              >
                ← Back to sign in
              </button>
              <h2 className="text-xl font-semibold text-white mb-1">Sign in with a code</h2>
              <p className="text-white/40 text-sm mb-6">
                We&apos;ll send a 6-digit code to your email. No password needed.
              </p>
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@facility.com"
                    required
                    autoFocus
                    autoComplete="email"
                    className="w-full px-3.5 py-2.5 bg-white/[0.07] border border-white/[0.12] rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition-all"
                  />
                </div>
                {error && (
                  <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors shadow-lg shadow-emerald-500/30 active:scale-[0.98]"
                >
                  {loading ? 'Sending...' : 'Send code'}
                </button>
              </form>
            </>
          )}

          {/* ── Forgot mode ── */}
          {mode === 'forgot' && (
            <>
              <button
                onClick={() => { setMode('login'); setError(null) }}
                className="text-white/40 hover:text-white/70 text-xs mb-5 transition-colors flex items-center gap-1"
              >
                ← Back to sign in
              </button>
              <h2 className="text-xl font-semibold text-white mb-1">Reset your password</h2>
              <p className="text-white/40 text-sm mb-6">Enter the email address associated with your account.</p>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@facility.com"
                    required
                    autoFocus
                    autoComplete="email"
                    className="w-full px-3.5 py-2.5 bg-white/[0.07] border border-white/[0.12] rounded-lg text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition-all"
                  />
                </div>
                {error && (
                  <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors shadow-lg shadow-emerald-500/30 active:scale-[0.98]"
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
            </>
          )}

          {/* ── Forgot sent mode ── */}
          {mode === 'forgot_sent' && (
            <div className="text-center space-y-3 py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Check your email</h2>
              <p className="text-white/50 text-sm">
                We sent a password reset link to{' '}
                <span className="text-white font-medium">{email}</span>.
              </p>
              <p className="text-white/30 text-xs">
                Didn&apos;t receive it?{' '}
                <button
                  onClick={() => setMode('forgot')}
                  className="text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-2"
                >
                  Try again
                </button>
                {' '}or check your spam folder.
              </p>
              <button
                onClick={() => { setMode('login'); setError(null) }}
                className="text-white/40 hover:text-white/70 text-sm transition-colors pt-1 block w-full"
              >
                Back to sign in
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          Invitation-only · Contact your facility director for access
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense><LoginContent /></Suspense>
}
