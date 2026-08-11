'use client'

import '../../auth/auth.css'
import { useState, useTransition } from 'react'
import { Loader2, CheckCircle, Eye, EyeOff, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { markFirstLoginComplete } from './actions'
import type { UserProfile } from '@/types'

const ROLE_BULLETS: Record<string, string[]> = {
  lifeguard: [
    'View your audit history and LPR score',
    'Track and complete any open remediations',
    'Check your certification expiry dates',
  ],
  supervisor: [
    'Run in-water audits directly from your device',
    'Assign remediations and track completion',
    'Monitor your team\'s daily schedule',
  ],
  manager: [
    'Review facility-wide performance metrics',
    'Manage your team roster and send invites',
    'Configure audit cadences and facility settings',
  ],
  director: [
    'Review facility-wide performance metrics',
    'Manage your team roster and send invites',
    'Configure audit cadences and facility settings',
  ],
  corporate: [
    'Monitor performance across all facilities',
    'Spot trends and benchmark between locations',
    'Access executive-level reporting',
  ],
}

const ROLE_CTA: Record<string, string> = {
  lifeguard: 'Go to my profile',
  supervisor: 'Open schedule',
  manager: 'Open schedule',
  director: 'Open schedule',
  corporate: 'Go to dashboard',
}

interface Props {
  profile: UserProfile
  facilityName: string | null
}

export function WelcomeClient({ profile, facilityName }: Props) {
  const [isPending, startTransition] = useTransition()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [savingPw, setSavingPw] = useState(false)

  const firstName = profile.name.split(' ')[0]
  const initials = profile.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const bullets = ROLE_BULLETS[profile.role] ?? []
  const cta = ROLE_CTA[profile.role] ?? 'Get started'
  const supabase = createClient()

  const passwordsMatch = confirm.length > 0 && password === confirm
  const passwordsMismatch = confirm.length > 0 && password !== confirm

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setPwError('Passwords do not match.'); return }
    if (password.length < 6) { setPwError('Password must be at least 6 characters.'); return }
    setSavingPw(true)
    setPwError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setSavingPw(false)
    if (error) { setPwError(error.message); return }
    // Password set — proceed to role page
    startTransition(async () => { await markFirstLoginComplete() })
  }

  function handleSkip() {
    startTransition(async () => { await markFirstLoginComplete() })
  }

  return (
    <div className="dp-auth">
      <div className="dp-auth-inner">

        {/* Card */}
        <div className="dp-auth-card">
          <span className="dp-auth-tick dp-auth-tick-tl" aria-hidden="true" />
          <span className="dp-auth-tick dp-auth-tick-tr" aria-hidden="true" />
          <span className="dp-auth-tick dp-auth-tick-bl" aria-hidden="true" />
          <span className="dp-auth-tick dp-auth-tick-br" aria-hidden="true" />

          {/* Avatar + heading */}
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div
              style={{
                width: 56,
                height: 56,
                margin: '0 auto 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--disp)',
                fontWeight: 700,
                fontSize: 18,
                color: '#efece3',
                border: '1px solid var(--ink)',
                backgroundColor: profile.avatar_color ?? '#0a0f14',
              }}
            >
              {initials}
            </div>

            <h1 className="dp-auth-title">Welcome, {firstName}<i>.</i></h1>
            {facilityName && (
              <p className="dp-auth-sub" style={{ marginBottom: 10 }}>
                You&apos;ve been added to {facilityName}
              </p>
            )}
            <span
              className="dp-auth-label"
              style={{
                display: 'inline-block',
                border: '1px solid var(--ink)',
                padding: '4px 10px',
                opacity: 0.8,
                marginBottom: 0,
              }}
            >
              {profile.role.replace('_', ' ')}
            </span>
          </div>

          {/* Bullets */}
          {bullets.length > 0 && (
            <ul style={{ listStyle: 'none', margin: '0 0 20px', padding: 0 }}>
              {bullets.map((b) => (
                <li
                  key={b}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '8px 0',
                    borderTop: '1px dashed rgba(10,15,20,0.2)',
                    fontSize: 11,
                    lineHeight: 1.6,
                    letterSpacing: '0.03em',
                  }}
                >
                  <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: '#ff4a1a' }} />
                  {b}
                </li>
              ))}
            </ul>
          )}

          {/* Password setup */}
          <div style={{ borderTop: '1px solid rgba(10,15,20,0.25)', paddingTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Lock className="w-3.5 h-3.5" style={{ opacity: 0.5 }} />
              <span className="dp-auth-label" style={{ marginBottom: 0, opacity: 0.8 }}>Set a password</span>
            </div>
            <p className="dp-auth-sub" style={{ marginBottom: 16 }}>
              Add a password so you can sign in quickly next time.
            </p>

            <form onSubmit={handleSetPassword}>
              <div className="dp-auth-field">
                <div className="dp-auth-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password"
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
                <div className="dp-auth-input-wrap">
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Confirm password"
                    autoComplete="new-password"
                    className="dp-auth-input"
                  />
                  {passwordsMatch && (
                    <CheckCircle className="dp-auth-eye w-4 h-4 pointer-events-none" style={{ color: '#0a8a72' }} />
                  )}
                  {passwordsMismatch && (
                    <span className="dp-auth-eye pointer-events-none" style={{ color: '#ff4a1a' }}>✕</span>
                  )}
                </div>
              </div>

              {pwError && <p className="dp-auth-error">{pwError}</p>}

              <button
                type="submit"
                disabled={savingPw || isPending || !password || !confirm}
                className="dp-auth-btn"
              >
                {(savingPw || isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                {savingPw || isPending ? 'Saving…' : cta}<span aria-hidden="true">→</span>
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 14 }}>
              <button
                onClick={handleSkip}
                disabled={isPending || savingPw}
                className="dp-auth-link"
              >
                Skip for now — I&apos;ll use a code each time
              </button>
            </p>
          </div>
        </div>

        <p className="dp-auth-foot">
          PoolControl.ai · Aquatics Performance Platform
        </p>
      </div>
    </div>
  )
}
