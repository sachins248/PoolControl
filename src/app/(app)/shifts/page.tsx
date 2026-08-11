import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ShiftsClient } from './shifts-client'
import type { UserProfile } from '@/types'

export default async function ShiftsPage() {
  const profile = await requireUser()
  if (profile.role === 'lifeguard') redirect('/my-profile')
  if (!profile.facility_id) return null

  const supabase = createClient()

  const [{ data: facility }, { data: staff }] = await Promise.all([
    supabase
      .from('facilities')
      .select('name, config')
      .eq('id', profile.facility_id)
      .single(),
    supabase
      .from('user_profiles')
      .select('*')
      .eq('facility_id', profile.facility_id)
      .in('role', ['lifeguard', 'supervisor'])
      .eq('is_active', true)
      .order('role', { ascending: false }) // supervisors first
      .order('name'),
  ])

  const zones = (facility?.config?.zones ?? ['Main Pool']) as string[]

  return (
    <ShiftsClient
      staff={(staff ?? []) as UserProfile[]}
      zones={zones}
      facilityName={facility?.name ?? 'Your Facility'}
    />
  )
}
