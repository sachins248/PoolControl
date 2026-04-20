'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Waves } from 'lucide-react'

type Mode = 'login' | 'forgot' | 'forgot_sent'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [mode, setMode] = useState<Mode>('login')
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

    // Hard redirect — server page will validate session and route by role
    window.location.href = '/schedule'
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setMode('forgot_sent')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f1e2e] to-[#0a1f1a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30 mb-4">
            <Waves className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">PoolControl.ai</h1>
          <p className="text-white/40 text-sm mt-1">Aquatics Performance Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.06] border border-white/[0.1] rounded-2xl p-7 backdrop-blur-sm shadow-2xl">

          {mode === 'login' && (
            <>
              <h2 className="text-lg font-semibold text-white mb-5">Sign in to your account</h2>
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
                    className="w-full px-3.5 py-2.5 bg-white/[0.07] border border-white/[0.12] rounded-lg text-white placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full px-3.5 py-2.5 bg-white/[0.07] border border-white/[0.12] rounded-lg text-white placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 transition-all pr-10"
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
                  <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors shadow-lg shadow-emerald-500/20"
                >
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
              </form>

              <button
                onClick={() => { setMode('forgot'); setError(null) }}
                className="w-full text-center text-white/40 hover:text-white/70 text-xs mt-4 transition-colors"
              >
                Forgot your password?
              </button>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <button
                onClick={() => { setMode('login'); setError(null) }}
                className="text-white/40 hover:text-white/70 text-xs mb-4 transition-colors flex items-center gap-1"
              >
                ← Back to sign in
              </button>
              <h2 className="text-lg font-semibold text-white mb-1">Reset your password</h2>
              <p className="text-white/40 text-sm mb-5">We&apos;ll send a reset link to your email.</p>
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
                    className="w-full px-3.5 py-2.5 bg-white/[0.07] border border-white/[0.12] rounded-lg text-white placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition-all"
                  />
                </div>
                {error && (
                  <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors"
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
            </>
          )}

          {mode === 'forgot_sent' && (
            <div className="text-center space-y-3 py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                <Waves className="w-6 h-6 text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">Check your email</h2>
              <p className="text-white/50 text-sm">
                We sent a password reset link to <span className="text-white font-medium">{email}</span>.
              </p>
              <button
                onClick={() => { setMode('login'); setError(null) }}
                className="text-emerald-400 hover:text-emerald-300 text-sm transition-colors"
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
