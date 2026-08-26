'use server'

import { revalidatePath } from 'next/cache'
import { requireUserForAction, isManager } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { sendSchedulePublishedWebhooks } from '@/lib/webhooks'

function canManageSchedule(role: string) {
  return isManager(role) || role === 'supervisor'
}

export async function setShiftAssignment(
  lifeguardId: string,
  date: string,
  shiftCode: string | null,
) {
  const { profile } = await requireUserForAction()
  if (!canManageSchedule(profile.role) || !profile.facility_id) throw new Error('Unauthorized')

  const service = createServiceClient()

  if (shiftCode === null) {
    const { error } = await service
      .from('shift_assignments')
      .delete()
      .eq('facility_id', profile.facility_id)
      .eq('lifeguard_id', lifeguardId)
      .eq('work_date', date)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await service
      .from('shift_assignments')
      .upsert(
        {
          facility_id: profile.facility_id,
          lifeguard_id: lifeguardId,
          work_date: date,
          shift_code: shiftCode,
          start_time: null,
          end_time: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'facility_id,lifeguard_id,work_date' },
      )
    if (error) throw new Error(error.message)
  }

  revalidatePath('/shifts')
}

export async function publishSchedule(startDate: string, endDate: string) {
  const { profile } = await requireUserForAction()
  if (!canManageSchedule(profile.role) || !profile.facility_id) throw new Error('Unauthorized')

  const service = createServiceClient()

  const { error } = await service
    .from('shift_assignments')
    .update({ is_published: true, updated_at: new Date().toISOString() })
    .eq('facility_id', profile.facility_id)
    .gte('work_date', startDate)
    .lte('work_date', endDate)

  if (error) throw new Error(error.message)

  const { data: facility } = await service
    .from('facilities')
    .select('name, config')
    .eq('id', profile.facility_id)
    .single()

  const config = (facility?.config ?? {}) as Record<string, string>
  if (config.slack_webhook_url || config.teams_webhook_url) {
    await sendSchedulePublishedWebhooks(
      { slack: config.slack_webhook_url, teams: config.teams_webhook_url },
      { startDate, endDate, facilityName: facility?.name ?? 'Your Facility' },
    )
  }

  revalidatePath('/shifts')
}

export async function copyPreviousWeek(startDate: string) {
  const { profile } = await requireUserForAction()
  if (!canManageSchedule(profile.role) || !profile.facility_id) throw new Error('Unauthorized')

  const service = createServiceClient()

  const currentStart = new Date(startDate)
  const prevStart = new Date(currentStart)
  prevStart.setDate(prevStart.getDate() - 14)
  const prevEnd = new Date(currentStart)
  prevEnd.setDate(prevEnd.getDate() - 1)

  const fmt = (d: Date) => d.toISOString().slice(0, 10)

  const { data: prevAssignments, error: fetchError } = await service
    .from('shift_assignments')
    .select('lifeguard_id, work_date, shift_code, start_time, end_time')
    .eq('facility_id', profile.facility_id)
    .gte('work_date', fmt(prevStart))
    .lte('work_date', fmt(prevEnd))

  if (fetchError) throw new Error(fetchError.message)
  if (!prevAssignments || prevAssignments.length === 0) {
    revalidatePath('/shifts')
    return
  }

  const rows = prevAssignments.map((a) => {
    const newDate = new Date(a.work_date)
    newDate.setDate(newDate.getDate() + 14)
    return {
      facility_id: profile.facility_id,
      lifeguard_id: a.lifeguard_id,
      work_date: fmt(newDate),
      shift_code: a.shift_code,
      start_time: a.start_time,
      end_time: a.end_time,
      updated_at: new Date().toISOString(),
    }
  })

  const { error } = await service
    .from('shift_assignments')
    .upsert(rows, { onConflict: 'facility_id,lifeguard_id,work_date' })

  if (error) throw new Error(error.message)

  revalidatePath('/shifts')
}
