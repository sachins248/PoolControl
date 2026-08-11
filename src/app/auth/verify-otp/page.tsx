'use client'

import '../auth.css'
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

          <h1 className="dp-auth-title">Enter your code<i>.</i></h1>
          <p className="dp-auth-sub">
            We sent a 6-digit code to <strong>{email}</strong>. Check your inbox.
          </p>

          {/* 6-digit input */}
          <div className="dp-auth-otp">
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
              />
            ))}
          </div>

          {/* Error */}
          {(pageState === 'error' && errorMsg) && (
            <p className="dp-auth-error">{errorMsg}</p>
          )}

          {/* Resent confirmation */}
          {resent && (
            <p className="dp-auth-ok">New code sent — check your inbox.</p>
          )}

          {/* Verify button */}
          <button
            onClick={handleVerify}
            disabled={!allFilled || pageState === 'verifying'}
            className="dp-auth-btn"
          >
            {pageState === 'verifying' ? 'Verifying…' : 'Verify code'}<span aria-hidden="true">→</span>
          </button>

          {/* Resend */}
          <p className="dp-auth-sub" style={{ textAlign: 'center', margin: '18px 0 0' }}>
            Didn&apos;t get it?{' '}
            <button onClick={handleResend} className="dp-auth-link dp-auth-link-strong">
              Resend code
            </button>
          </p>

          {/* Back */}
          <p style={{ textAlign: 'center', marginTop: 12 }}>
            <button onClick={() => router.push('/auth/login')} className="dp-auth-link">
              ← Back to sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function VerifyOTPPage() {
  return <Suspense><VerifyOTPContent /></Suspense>
}
