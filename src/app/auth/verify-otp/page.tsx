'use client'

import { Suspense } from 'react'
import { useState, useRef, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type PageState = 'entering' | 'verifying' | 'error'

function VerifyOTPContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get('email') ?? ''
  const supabase = createClient()

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [pageState, setPageState] = useState<PageState>('entering')
  const [errorMsg, setErrorMsg] = useState('')
  const [resent, setResent] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const code = digits.join('')
  const allFilled = code.length === 6

  function handleChange(idx: number, value: string) {
    // Handle paste of full code
    if (value.length > 1) {
      const cleaned = value.replace(/\D/g, '').slice(0, 6)
      const next = [...digits]
      for (let i = 0; i < 6; i++) next[i] = cleaned[i] ?? ''
      setDigits(next)
      const focusIdx = Math.min(cleaned.length, 5)
      inputRefs.current[focusIdx]?.focus()
      return
    }

    const cleaned = value.replace(/\D/g, '')
    const next = [...digits]
    next[idx] = cleaned
    setDigits(next)

    if (cleaned && idx < 5) {
      inputRefs.current[idx + 1]?.focus()
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  async function handleVerify() {
    if (!allFilled || pageState === 'verifying') return
    setPageState('verifying')
    setErrorMsg('')

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    })

    if (error) {
      setErrorMsg('Invalid or expired code. Try again.')
      setPageState('error')
      setDigits(['', '', '', '', '', ''])
      setTimeout(() => inputRefs.current[0]?.focus(), 50)
      return
    }

    window.location.href = '/auth/callback-redirect'
  }

  async function handleResend() {
    await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    })
    setResent(true)
    setDigits(['', '', '', '', '', ''])
    setErrorMsg('')
    setPageState('entering')
    setTimeout(() => {
      inputRefs.current[0]?.focus()
      setResent(false)
    }, 3000)
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
          <h2 className="text-xl font-semibold text-white mb-1">Enter your code</h2>
          <p className="text-white/40 text-sm mb-6">
            We sent a 6-digit code to{' '}
            <span className="text-white/70 font-medium">{email}</span>.
            Check your inbox.
          </p>

          {/* 6-digit input */}
          <div className="flex gap-2 justify-between mb-6">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={d}
                onChange={(e) => handleChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                onFocus={(e) => e.target.select()}
                className="w-12 h-14 text-center text-xl font-bold bg-white/[0.07] border border-white/[0.15] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 transition-all caret-transparent"
              />
            ))}
          </div>

          {/* Error */}
          {(pageState === 'error' && errorMsg) && (
            <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2 mb-4">
              {errorMsg}
            </p>
          )}

          {/* Resent confirmation */}
          {resent && (
            <p className="text-emerald-400 text-xs bg-emerald-400/10 border border-emerald-400/20 rounded-lg px-3 py-2 mb-4">
              New code sent — check your inbox.
            </p>
          )}

          {/* Verify button */}
          <button
            onClick={handleVerify}
            disabled={!allFilled || pageState === 'verifying'}
            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition-colors shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
          >
            {pageState === 'verifying' ? 'Verifying...' : 'Verify code'}
          </button>

          {/* Resend */}
          <p className="text-center text-white/30 text-xs mt-4">
            Didn&apos;t get it?{' '}
            <button
              onClick={handleResend}
              className="text-emerald-400 hover:text-emerald-300 transition-colors underline underline-offset-2"
            >
              Resend code
            </button>
          </p>

          {/* Back */}
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full text-center text-white/25 hover:text-white/50 text-xs mt-3 transition-colors"
          >
            ← Back to sign in
          </button>
        </div>
      </div>
    </div>
  )
}

export default function VerifyOTPPage() {
  return <Suspense><VerifyOTPContent /></Suspense>
}
