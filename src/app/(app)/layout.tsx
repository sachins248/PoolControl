import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireUser()

  let facilityName = 'Aquatics Command Center'
  if (profile.facility_id) {
    const supabase = createClient()
    const { data: facility } = await supabase
      .from('facilities')
      .select('name')
      .eq('id', profile.facility_id)
      .single()
    if (facility) facilityName = facility.name
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        facilityName={facilityName}
        userRole={profile.role}
        userName={profile.name}
      />
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  )
}
