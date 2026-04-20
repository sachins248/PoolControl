import { createServiceClient } from '@/lib/supabase/server'
import { getDemoUser } from '@/lib/demo-auth'
import Link from 'next/link'
import { CalendarDays, AlertTriangle, Users, BarChart3 } from 'lucide-react'

export default async function DashboardPage() {
  const profile = await getDemoUser()
  if (!profile?.facility_id) return null

  const supabase = createServiceClient()
  const facilityId = profile.facility_id

  const [
    { count: lifeguardCount },
    { count: openRemediations },
    { count: auditsThisMonth },
  ] = await Promise.all([
    supabase.from('user_profiles').select('*', { count: 'exact', head: true })
      .eq('facility_id', facilityId).eq('role', 'lifeguard'),
    supabase.from('remediation_tasks').select('*', { count: 'exact', head: true })
      .eq('facility_id', facilityId).in('status', ['assigned', 'acknowledged', 'in_deck']),
    supabase.from('audits').select('*', { count: 'exact', head: true })
      .eq('facility_id', facilityId)
      .gte('submitted_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ])

  const stats = [
    { label: 'Lifeguards on Roster', value: lifeguardCount ?? 0, icon: Users, href: '/roster', color: 'text-blue-600 bg-blue-50' },
    { label: 'Open Remediations', value: openRemediations ?? 0, icon: AlertTriangle, href: '/remediation', color: 'text-red-600 bg-red-50' },
    { label: 'Audits This Month', value: auditsThisMonth ?? 0, icon: CalendarDays, href: '/schedule', color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Team Analysis', value: '→', icon: BarChart3, href: '/team', color: 'text-purple-600 bg-purple-50' },
  ]

  return (
    <div className="px-8 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
      <p className="text-gray-500 text-sm mb-6">Welcome back, {profile.name?.split(' ')[0]}</p>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Link key={s.label} href={s.href} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-all">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Link href="/schedule" className="bg-[#0f1e2e] text-white rounded-xl p-6 hover:opacity-90 transition-opacity">
          <CalendarDays className="w-6 h-6 text-emerald-400 mb-3" />
          <h3 className="font-semibold text-lg">Open Daily Schedule</h3>
          <p className="text-white/50 text-sm mt-1">See who to audit today and start a new audit</p>
        </Link>
        <Link href="/audits/new" className="bg-emerald-500 text-white rounded-xl p-6 hover:bg-emerald-400 transition-colors">
          <CalendarDays className="w-6 h-6 text-white/80 mb-3" />
          <h3 className="font-semibold text-lg">Start New Audit</h3>
          <p className="text-white/70 text-sm mt-1">Select an audit type and lifeguard to begin</p>
        </Link>
      </div>
    </div>
  )
}
