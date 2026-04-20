import { createServiceClient } from '@/lib/supabase/server'
import { getDemoUser } from '@/lib/demo-auth'
import { Sidebar } from '@/components/layout/sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getDemoUser()

  let facilityName = 'Aquatics Command Center'
  if (profile?.facility_id) {
    const supabase = createServiceClient()
    const { data: facility } = await supabase
      .from('facilities')
      .select('name')
      .eq('id', profile.facility_id)
      .single()
    if (facility) facilityName = facility.name
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar facilityName={facilityName} />
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  )
}
