'use client'

import { useTransition } from 'react'
import { Loader2, Waves } from 'lucide-react'
import { markFirstLoginComplete } from './actions'
import type { UserProfile } from '@/types'

const ROLE_DESCRIPTIONS: Record<string, string> = {
  lifeguard: 'Track your audit scores, view open remediations, and monitor your Lifeguard Performance Rating.',
  supervisor: "Conduct lifeguard audits, assign remediations, and keep your team's safety standards high.",
  director: 'Manage your team roster, review facility-wide performance, and configure audit settings.',
  corporate: 'Monitor performance across all facilities from one unified dashboard.',
}

interface Props {
  profile: UserProfile
}

export function WelcomeClient({ profile }: Props) {
  const [isPending, startTransition] = useTransition()
  const firstName = profile.name.split(' ')[0]

  function handleGetStarted() {
    startTransition(async () => {
      await markFirstLoginComplete()
    })
  }

  return (
    <div className="min-h-screen bg-[#0f1e2e] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500 text-white mx-auto mb-6">
          <Waves className="w-8 h-8" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Welcome, {firstName}!
        </h1>
        <p className="text-gray-500 text-sm mb-1 capitalize font-medium">{profile.role} · PoolControl.ai</p>

        <p className="text-gray-600 text-sm mt-4 mb-8 leading-relaxed">
          {ROLE_DESCRIPTIONS[profile.role] ?? 'You\'re all set up and ready to go.'}
        </p>

        <button
          onClick={handleGetStarted}
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors text-sm"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {isPending ? 'Getting started...' : 'Get Started →'}
        </button>
      </div>
    </div>
  )
}
