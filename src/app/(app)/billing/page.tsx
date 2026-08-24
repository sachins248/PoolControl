import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { CheckCircle2, Clock, Mail, ShieldCheck, BarChart3, Users, Brain } from 'lucide-react'

export default async function BillingPage() {
  const profile = await requireUser()
  const supabase = createClient()

  const { data: facility } = await supabase
    .from('facilities')
    .select('name, plan, trial_ends_at')
    .eq('id', profile.facility_id!)
    .single()

  const plan = facility?.plan ?? 'trial'
  const trialEndsAt = facility?.trial_ends_at ? new Date(facility.trial_ends_at) : null
  const msLeft = trialEndsAt ? trialEndsAt.getTime() - Date.now() : 0
  const daysLeft = trialEndsAt ? Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24))) : 0
  const isExpired = plan === 'trial' && daysLeft === 0
  const trialEndStr = trialEndsAt
    ? trialEndsAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null
  const daysUsed = 14 - daysLeft
  const progressPct = Math.min(100, (daysUsed / 14) * 100)

  const features = [
    { icon: Users, label: 'Unlimited lifeguards & audits' },
    { icon: Brain, label: 'AI coaching with Coach PC' },
    { icon: ShieldCheck, label: 'Remediation tracking & compliance' },
    { icon: BarChart3, label: 'Team analytics & training plans' },
  ]

  return (
    <div className="px-8 py-6 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Billing</h1>
        <p className="text-gray-500 text-sm">Manage your PoolControl.ai subscription</p>
      </div>

      <div className="grid grid-cols-5 gap-5">
        {/* Left — plan status */}
        <div className="col-span-3 space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="bg-[#0f1e2e] px-6 py-5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">Current plan</p>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  isExpired
                    ? 'bg-red-500/20 text-red-400'
                    : plan === 'trial'
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {isExpired ? 'Expired' : plan === 'trial' ? 'Free Trial' : 'Active'}
                </span>
              </div>
              <p className="text-white text-xl font-bold">
                {plan !== 'trial' ? 'Professional' : isExpired ? 'Trial ended' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
              </p>
              {plan === 'trial' && trialEndStr && (
                <p className="text-white/40 text-xs mt-1">
                  {isExpired ? `Expired on ${trialEndStr}` : `Trial ends ${trialEndStr}`}
                </p>
              )}
            </div>

            {/* Progress bar */}
            {plan === 'trial' && !isExpired && (
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex justify-between text-xs text-gray-400 mb-2">
                  <span>{daysUsed} of 14 days used</span>
                  <span>{daysLeft} left</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${daysLeft <= 3 ? 'bg-red-500' : daysLeft <= 7 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            )}

            {/* Features */}
            <div className="px-6 py-5 space-y-3">
              {features.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <span className="text-sm text-gray-600">{label}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 ml-auto flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>

          {/* Cancel */}
          {plan === 'trial' && !isExpired && (
            <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Cancel trial</p>
                <p className="text-xs text-gray-400 mt-0.5">Your data is kept for 30 days</p>
              </div>
              <a
                href={`mailto:poolcontrolnate@gmail.com?subject=Cancel trial — ${facility?.name}&body=Hi, I'd like to cancel the trial for ${facility?.name}. Please confirm.`}
                className="text-xs text-red-500 hover:text-red-600 font-semibold border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                Request cancel
              </a>
            </div>
          )}
        </div>

        {/* Right — CTA + steps */}
        <div className="col-span-2 space-y-4">
          <div className="bg-emerald-500 rounded-2xl p-6 text-white">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center mb-4">
              <Mail className="w-[18px] h-[18px] text-white" />
            </div>
            <h3 className="font-bold text-base mb-1">
              {isExpired ? 'Restore access' : 'Ready to continue?'}
            </h3>
            <p className="text-white/70 text-xs leading-relaxed mb-5">
              {isExpired
                ? "Your trial ended. Reach out and we'll reactivate your account today."
                : "We'll send a contract and get you fully set up. No hidden fees."}
            </p>
            <a
              href={`mailto:poolcontrolnate@gmail.com?subject=${isExpired ? 'Restore access' : 'Ready to continue'} — ${facility?.name}&body=Hi, ${isExpired ? `our trial for ${facility?.name} has expired and we'd like to restore access.` : `we'd like to continue using PoolControl.ai. Please send the contract for ${facility?.name}.`}`}
              className="block w-full bg-white text-emerald-600 text-sm font-bold text-center py-2.5 rounded-xl hover:bg-emerald-50 transition-colors"
            >
              Contact us
            </a>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-gray-400" />
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">How it works</p>
            </div>
            <ol className="space-y-3.5">
              {['Email us to continue', 'We send a contract', 'Wire payment & go live'].map((step, i) => (
                <li key={step} className="flex items-center gap-3">
                  <span className="w-5 h-5 bg-[#0f1e2e] text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-600">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}
