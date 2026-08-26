import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ShiftsClient } from './shifts-client'
import type { UserProfile, ShiftAssignment, ShiftType } from '@/types'

const DEFAULT_SHIFT_TYPES: ShiftType[] = [
  { code: 'O', label: 'Open', start: '09:30', end: '16:00', color: 'emerald' },
  { code: 'M', label: 'Mid', start: '11:00', end: '19:00', color: 'blue' },
  { code: 'C', label: 'Close', start: '14:00', end: '21:30', color: 'purple' },
]

function mondayOf(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export default async function ShiftsPage({
  searchParams,
}: {
  searchParams: { start?: string }
}) {
  const profile = await requireUser()
  if (profile.role === 'lifeguard') redirect('/my-profile')
  if (!profile.facility_id) return null

  const supabase = createClient()

  const start = searchParams.start ? new Date(searchParams.start) : mondayOf(new Date())
  const startDate = fmt(start)
  const end = new Date(start)
  end.setDate(end.getDate() + 13)
  const endDate = fmt(end)

  const [{ data: facility }, { data: staff }, { data: assignments }] = await Promise.all([
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
    supabase
      .from('shift_assignments')
      .select('*')
      .eq('facility_id', profile.facility_id)
      .gte('work_date', startDate)
      .lte('work_date', endDate),
  ])

  const shiftTypes = (facility?.config?.shift_types?.length ? facility.config.shift_types : DEFAULT_SHIFT_TYPES) as ShiftType[]

  return (
    <ShiftsClient
      staff={(staff ?? []) as UserProfile[]}
      shiftTypes={shiftTypes}
      assignments={(assignments ?? []) as ShiftAssignment[]}
      startDate={startDate}
      facilityName={facility?.name ?? 'Your Facility'}
    />
  )
}
