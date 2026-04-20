'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Eye } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f1e2e] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-500 mb-4">
            <Eye className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">PoolControl.ai</h1>
          <p className="text-white/50 text-sm mt-1">Performance Intelligence for Aquatics</p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur">
          {sent ? (
            <div className="text-center space-y-3">
              <div className="text-4xl">📬</div>
              <h2 className="text-lg font-semibold text-white">Check your email</h2>
              <p className="text-white/60 text-sm">
                We sent a sign-in link to <span className="text-white font-medium">{email}</span>.
                Click it to access your facility dashboard.
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-white/50 hover:text-white"
                onClick={() => setSent(false)}
              >
                Use a different email
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Sign in</h2>
                <p className="text-white/50 text-sm">
                  Enter your facility email to receive a sign-in link.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-white/70 text-sm">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@facility.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 focus:border-emerald-400 focus:ring-emerald-400"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-medium"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send sign-in link'}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          PoolControl.ai is invitation-only. Contact your facility director to get access.
        </p>
      </div>
    </div>
  )
}
