import { requireUser, isSuperAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import AdminClient from './admin-client'

export default async function AdminPage() {
  const profile = await requireUser()
  if (!isSuperAdmin(profile.role)) redirect('/schedule')

  const service = createServiceClient()

  const [{ data: facilities }, { data: staffRows }, { data: auditRows }] = await Promise.all([
    service
      .from('facilities')
      .select('id, name, plan, billing_status, trial_ends_at, created_at')
      .order('created_at', { ascending: false }),
    service
      .from('user_profiles')
      .select('facility_id')
      .eq('is_active', true)
      .not('facility_id', 'is', null),
    service
      .from('audits')
      .select('facility_id, submitted_at')
      .order('submitted_at', { ascending: false })
      .limit(500),
  ])

  const countByFacility: Record<string, number> = {}
  for (const row of staffRows ?? []) {
    if (row.facility_id) {
      countByFacility[row.facility_id] = (countByFacility[row.facility_id] ?? 0) + 1
    }
  }

  // First entry per facility (ordered desc) is the most recent audit
  const lastActiveByFacility: Record<string, string> = {}
  for (const row of auditRows ?? []) {
    if (row.facility_id && !lastActiveByFacility[row.facility_id]) {
      lastActiveByFacility[row.facility_id] = row.submitted_at
    }
  }

  const facilitiesWithCounts = (facilities ?? []).map((f) => ({
    ...f,
    staffCount: countByFacility[f.id] ?? 0,
    lastActive: lastActiveByFacility[f.id] ?? null,
  }))

  return <AdminClient facilities={facilitiesWithCounts} />
}
