import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { WelcomeClient } from './welcome-client'

export default async function WelcomePage() {
  const profile = await requireUser()
  const supabase = createClient()

  const { data: facility } = await supabase
    .from('facilities')
    .select('name')
    .eq('id', profile.facility_id)
    .single()

  return <WelcomeClient profile={profile} facilityName={facility?.name ?? null} />
}
