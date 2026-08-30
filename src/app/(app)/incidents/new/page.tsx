import { requireUser, isManager } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewIncidentClient } from './new-incident-client'
import type { UserProfile, WaterBody } from '@/types'

export default async function NewIncidentPage() {
  const profile = await requireUser()
  if (!isManager(profile.role) && profile.role !== 'supervisor') redirect('/incidents')
  if (!profile.facility_id) return null

  const supabase = createClient()
  const [{ data: bodies }, { data: staff }] = await Promise.all([
    supabase
      .from('water_bodies')
      .select('*')
      .eq('facility_id', profile.facility_id)
      .eq('is_active', true)
      .order('sort_order'),
    supabase
      .from('user_profiles')
      .select('*')
      .eq('facility_id', profile.facility_id)
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <NewIncidentClient
      waterBodies={(bodies ?? []) as WaterBody[]}
      staff={(staff ?? []) as UserProfile[]}
    />
  )
}
