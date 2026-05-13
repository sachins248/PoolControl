'use client'

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
  lifeguard: 'Go to my profile →',
  supervisor: 'Open schedule →',
  manager: 'Open schedule →',
  director: 'Open schedule →',
  corporate: 'Go to dashboard →',
}

const ROLE_BADGE: Record<string, string> = {
  lifeguard: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  supervisor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  manager: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  director: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  corporate: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
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
  const cta = ROLE_CTA[profile.role] ?? 'Get Started →'
  const badgeClass = ROLE_BADGE[profile.role] ?? ROLE_BADGE.lifeguard
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
    <div className="min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0f1e2e] to-[#0a1f1a] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">

        {/* Glass card */}
        <div className="bg-white/[0.06] border border-white/[0.1] rounded-2xl p-8 backdrop-blur-sm shadow-2xl">

          {/* Avatar */}
          <div className="text-center mb-5">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold mx-auto mb-4 shadow-lg"
              style={{ backgroundColor: profile.avatar_color ?? '#10b981' }}
            >
              {initials}
            </div>

            <h1 className="text-2xl font-bold text-white mb-1">Welcome, {firstName}!</h1>
            {facilityName && (
              <p className="text-white/40 text-sm mb-3">You&apos;ve been added to {facilityName}</p>
            )}
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold capitalize ${badgeClass}`}>
              {profile.role}
            </span>
          </div>

          {/* Bullets */}
          {bullets.length > 0 && (
            <ul className="space-y-2.5 mb-6">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-2.5 text-sm text-white/70">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          )}

          {/* Password setup */}
          <div className="border-t border-white/[0.08] pt-5 mt-2">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-white/40" />
              <p className="text-sm font-medium text-white">Set a password</p>
            </div>
            <p className="text-white/40 text-xs mb-4">Add a password so you can sign in quickly next time.</p>

            <form onSubmit={handleSetPassword} className="space-y-3">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
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

              <div className="relative">
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  className="w-full px-3.5 py-2.5 bg-white/[0.07] border border-white/[0.12] rounded-lg text-white placeholder:text-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/60 transition-all pr-10"
                />
                {passwordsMatch && (
                  <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-400 pointer-events-none" />
                )}
                {passwordsMismatch && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400 text-lg pointer-events-none">✕</span>
                )}
              </div>

              {pwError && (
                <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{pwError}</p>
              )}

              <button
                type="submit"
                disabled={savingPw || isPending || !password || !confirm}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors shadow-lg shadow-emerald-500/20 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {(savingPw || isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                {savingPw || isPending ? 'Saving...' : `${cta}`}
              </button>
            </form>

            <button
              onClick={handleSkip}
              disabled={isPending || savingPw}
              className="w-full text-center text-white/25 hover:text-white/50 text-xs mt-3 transition-colors"
            >
              Skip for now — I&apos;ll use a code each time
            </button>
          </div>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          PoolControl.ai · Aquatics Performance Platform
        </p>
      </div>
    </div>
  )
}
