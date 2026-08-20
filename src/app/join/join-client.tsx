'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { lookupJoinCode, registerViaJoinCode } from './actions'

type Step = 'code' | 'details'

interface LookupResult {
  facilityId: string
  facilityName: string
  role: 'lifeguard' | 'supervisor'
}

export function JoinClient() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('code')
  const [code, setCode] = useState('')
  const [lookup, setLookup] = useState<LookupResult | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const result = await lookupJoinCode(code)
      setLookup(result)
      setStep('details')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!lookup) return
    setLoading(true)
    setError(null)
    setAlreadyRegistered(false)
    try {
      const { email: registeredEmail } = await registerViaJoinCode({ code, name, email })
      router.push(`/auth/verify-otp?email=${encodeURIComponent(registeredEmail)}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      setAlreadyRegistered(message.includes('already exists'))
      setLoading(false)
    }
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

          {step === 'code' && (
            <>
              <h1 className="dp-auth-title">Join your facility<i>.</i></h1>
              <p className="dp-auth-sub">Enter the access code your facility gave you.</p>

              <form onSubmit={handleLookup}>
                <div className="dp-auth-field">
                  <label className="dp-auth-label">Access code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="XXXXXXXX"
                    required
                    autoFocus
                    autoCapitalize="characters"
                    className="dp-auth-input"
                    style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}
                  />
                </div>

                {error && <p className="dp-auth-error">{error}</p>}

                <button type="submit" disabled={loading} className="dp-auth-btn">
                  {loading ? 'Checking…' : 'Continue'}<span aria-hidden="true">→</span>
                </button>
              </form>
            </>
          )}

          {step === 'details' && lookup && (
            <>
              <button
                onClick={() => { setStep('code'); setLookup(null); setError(null); setAlreadyRegistered(false) }}
                className="dp-auth-link"
                style={{ marginBottom: 18, display: 'block' }}
              >
                ← Back
              </button>
              <h1 className="dp-auth-title">Your details<i>.</i></h1>
              <p className="dp-auth-sub">
                Joining <strong>{lookup.facilityName}</strong> as <strong>{lookup.role}</strong>.
              </p>

              <form onSubmit={handleRegister}>
                <div className="dp-auth-field">
                  <label className="dp-auth-label">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    required
                    autoFocus
                    autoComplete="name"
                    className="dp-auth-input"
                  />
                </div>

                <div className="dp-auth-field">
                  <label className="dp-auth-label">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@facility.com"
                    required
                    autoComplete="email"
                    className="dp-auth-input"
                  />
                </div>

                {error && (
                  <p className="dp-auth-error">
                    {error}
                    {alreadyRegistered && (
                      <>
                        {' '}
                        <a href="/auth/login" className="dp-auth-link dp-auth-link-strong">
                          Sign in instead
                        </a>
                      </>
                    )}
                  </p>
                )}

                <button type="submit" disabled={loading} className="dp-auth-btn">
                  {loading ? 'Creating account…' : 'Create account'}<span aria-hidden="true">→</span>
                </button>
              </form>
            </>
          )}
        </div>

        <p className="dp-auth-foot">
          <a href="/auth/login" style={{ color: 'inherit' }}>Already have an account? Sign in</a>
        </p>
      </div>
    </div>
  )
}
