import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser()

  let facilityName = 'Aquatics Command Center'
  let trialDaysLeft: number | null = null
  let plan = 'trial'

  if (profile.facility_id) {
    const supabase = createClient()
    const { data: facility } = await supabase
      .from('facilities')
      .select('name, plan, trial_ends_at')
      .eq('id', profile.facility_id)
      .single()
    if (facility) {
      facilityName = facility.name
      plan = facility.plan ?? 'trial'
      if (facility.plan === 'trial' && facility.trial_ends_at) {
        const msLeft = new Date(facility.trial_ends_at).getTime() - Date.now()
        trialDaysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))
      }
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        facilityName={facilityName}
        userRole={profile.role}
        userName={profile.name}
        plan={plan}
        trialDaysLeft={trialDaysLeft}
      />
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  )
}
