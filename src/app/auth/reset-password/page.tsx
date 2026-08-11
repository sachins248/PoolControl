'use client'

import '../auth.css'
import { Suspense } from 'react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, CheckCircle, XCircle, Link2Off } from 'lucide-react'

type PageState = 'verifying' | 'ready' | 'expired'

function ResetPasswordContent() {
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
      <div className="dp-auth">
        <div className="dp-auth-inner" style={{ textAlign: 'center' }}>
          <div className="dp-auth-spin" aria-hidden="true" />
          <p className="dp-auth-sub" style={{ margin: 0 }}>Verifying link…</p>
        </div>
      </div>
    )
  }

  // ── Expired state ──────────────────────────────────────────────────────────
  if (pageState === 'expired') {
    return (
      <div className="dp-auth">
        <div className="dp-auth-inner">
          <div className="dp-auth-brand">
            <img src="/logo.jpeg" alt="PoolControl.ai" className="dp-auth-logo" />
            <span className="dp-auth-name">POOLCONTROL<i>.AI</i></span>
          </div>
          <div className="dp-auth-card" style={{ textAlign: 'center' }}>
            <span className="dp-auth-tick dp-auth-tick-tl" aria-hidden="true" />
            <span className="dp-auth-tick dp-auth-tick-tr" aria-hidden="true" />
            <span className="dp-auth-tick dp-auth-tick-bl" aria-hidden="true" />
            <span className="dp-auth-tick dp-auth-tick-br" aria-hidden="true" />
            <div className="dp-auth-glyph">
              <Link2Off className="w-5 h-5" />
            </div>
            <h1 className="dp-auth-title">This link has expired<i>.</i></h1>
            <p className="dp-auth-sub">
              Password links expire after 1 hour for security. Request a new one below.
            </p>
            <a href="/auth/login?mode=forgot" className="dp-auth-btn">
              Request a new link<span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </div>
    )
  }

  // ── Ready state ────────────────────────────────────────────────────────────
  return (
    <div className="dp-auth">
      <div className="dp-auth-inner">
        <div className="dp-auth-brand">
          <img src="/logo.jpeg" alt="PoolControl.ai" className="dp-auth-logo" />
          <span className="dp-auth-name">POOLCONTROL<i>.AI</i></span>
        </div>

        <div className="dp-auth-card">
          <span className="dp-auth-tick dp-auth-tick-tl" aria-hidden="true" />
          <span className="dp-auth-tick dp-auth-tick-tr" aria-hidden="true" />
          <span className="dp-auth-tick dp-auth-tick-bl" aria-hidden="true" />
          <span className="dp-auth-tick dp-auth-tick-br" aria-hidden="true" />

          {isSetup ? (
            <>
              <h1 className="dp-auth-title">Welcome<i>.</i></h1>
              <p className="dp-auth-sub">
                Your director has added you to your facility. Create a password to activate your account.
              </p>
            </>
          ) : (
            <>
              <h1 className="dp-auth-title">Set a new password<i>.</i></h1>
              <p className="dp-auth-sub">Choose something secure — at least 8 characters.</p>
            </>
          )}

          <form onSubmit={handleReset}>
            <div className="dp-auth-field">
              <label className="dp-auth-label">
                {isSetup ? 'Create a password' : 'New password'}
              </label>
              <div className="dp-auth-input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus
                  autoComplete="new-password"
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

            <div className="dp-auth-field">
              <label className="dp-auth-label">Confirm password</label>
              <div className="dp-auth-input-wrap">
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  className="dp-auth-input"
                />
                {passwordsMatch && (
                  <CheckCircle className="dp-auth-eye w-4 h-4 pointer-events-none" style={{ color: '#0a8a72' }} />
                )}
                {passwordsMismatch && (
                  <XCircle className="dp-auth-eye w-4 h-4 pointer-events-none" style={{ color: '#ff4a1a' }} />
                )}
              </div>
            </div>

            {error && <p className="dp-auth-error">{error}</p>}

            <button type="submit" disabled={loading} className="dp-auth-btn">
              {loading ? 'Saving…' : isSetup ? 'Create account' : 'Set password & sign in'}<span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordContent /></Suspense>
}
