'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Waves, Eye, EyeOff, CheckCircle, XCircle, Link2Off } from 'lucide-react'

type PageState = 'verifying' | 'ready' | 'expired'

export default function ResetPasswordPage() {
  const [pageState, setPageState] = useState<PageState>('verifying')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const isSetup = searchParams.get('setup') === 'true'
  const supabase = createClient()

  useEffect(() => {
    const hasRecoveryHash = window.location.hash.includes('type=recovery')

    // Timeout: shorter if hash is present (event should fire fast), longer if not
    const timeoutMs = hasRecoveryHash ? 8000 : 12000
    const timer = setTimeout(() => {
      setPageState((prev) => prev === 'verifying' ? 'expired' : prev)
    }, timeoutMs)

    // Always wait for PASSWORD_RECOVERY event — this ensures the correct user's
    // session is established before we show the form (avoids updating the wrong account)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        clearTimeout(timer)
        setPageState('ready')
      }
    })

    return () => {
      clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }

    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) { setError(error.message); return }
    router.replace('/auth/callback-redirect')
  }

  const passwordsMatch = confirm.length > 0 && password === confirm
  const passwordsMismatch = confirm.length > 0 && password !== confirm

  // ── Verifying state ────────────────────────────────────────────────────────
  if (pageState === 'verifying') {
    return (
      <div className="min-h-screen bg-[#0f1e2e] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white/60 text-sm">Verifying link...</p>
        </div>
      </div>
    )
  }

  // ── Expired state ──────────────────────────────────────────────────────────
  if (pageState === 'expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f1e2e] to-[#0a1f1a] flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30 mb-4">
              <Waves className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">PoolControl.ai</h1>
          </div>
          <div className="bg-white/[0.06] border border-white/[0.1] rounded-2xl p-7 backdrop-blur-sm shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <Link2Off className="w-6 h-6 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-2">This link has expired</h2>
            <p className="text-white/50 text-sm mb-6">
              Password links expire after 1 hour for security. Request a new one below.
            </p>
            <a
              href="/auth/login?mode=forgot"
              className="inline-flex w-full items-center justify-center py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold rounded-lg text-sm transition-colors shadow-lg shadow-emerald-500/20"
            >
              Request a new link
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ── Ready state ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f1e2e] to-[#0a1f1a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/30 mb-4">
            <Waves className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">PoolControl.ai</h1>
          {isSetup && (
            <p className="text-white/40 text-sm mt-1">Aquatics Performance Platform</p>
          )}
        </div>

        <div className="bg-white/[0.06] border border-white/[0.1] rounded-2xl p-7 backdrop-blur-sm shadow-2xl">
          {isSetup ? (
            <>
              <h2 className="text-xl font-semibold text-white mb-1">Welcome to PoolControl.ai</h2>
              <p className="text-white/40 text-sm mb-6">
                Your director has added you to your facility. Create a password to activate your account.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-white mb-1">Set a new password</h2>
              <p className="text-white/40 text-sm mb-6">Choose something secure — at least 8 characters.</p>
            </>
          )}

          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">
                {isSetup ? 'Create a password' : 'New password'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 bg-white/[0.07] border border-white/[0.12] rounded-lg text-white placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition-all pr-10"
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

            <div>
              <label className="block text-xs font-medium text-white/60 mb-1.5">Confirm password</label>
              <div className="relative">
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 bg-white/[0.07] border border-white/[0.12] rounded-lg text-white placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition-all pr-10"
                />
                {passwordsMatch && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
                )}
                {passwordsMismatch && (
                  <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400 pointer-events-none" />
                )}
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              {loading ? 'Saving...' : isSetup ? 'Create account →' : 'Set password & sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
