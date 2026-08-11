import { requireUser, isSuperAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import FacilityClient from './facility-client'

export default async function FacilityDetailPage({ params }: { params: { id: string } }) {
  const profile = await requireUser()
  if (!isSuperAdmin(profile.role)) redirect('/schedule')

  const service = createServiceClient()

  const [{ data: facility }, { data: staff }] = await Promise.all([
    service.from('facilities').select('id, name, plan, billing_status, trial_ends_at, created_at').eq('id', params.id).single(),
    service
      .from('user_profiles')
      .select('id, name, role, email, is_active, created_at')
      .eq('facility_id', params.id)
      .order('role'),
  ])

  if (!facility) redirect('/admin')

  return <FacilityClient facility={facility} staff={staff ?? []} />
}
