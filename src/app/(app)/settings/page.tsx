import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsClient } from './settings-client'
import type { UserProfile } from '@/types'

export default async function SettingsPage() {
  const profile = await requireUser()

  if (profile.role !== 'director') redirect('/schedule')
  if (!profile.facility_id) return null

  const supabase = createClient()

  const { data: facility } = await supabase
    .from('facilities')
    .select('id, name, cert_body, config')
    .eq('id', profile.facility_id)
    .single()

  const { data: staff } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('facility_id', profile.facility_id)
    .order('name')

  return (
    <SettingsClient
      facility={facility}
      staff={(staff ?? []) as UserProfile[]}
      facilityId={profile.facility_id}
      currentUserId={profile.id}
    />
  )
}
