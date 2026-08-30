import { requireUser, isManager } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { ChemistryClient } from './chemistry-client'
import { resolveTestInterval } from '@/lib/chemistry'
import type { ChemDefaults, ChemistryReading, WaterBody } from '@/types'

export interface BodyStatus {
  body: WaterBody
  lastTestedAt: string | null
  intervalMinutes: number
  openIssue: ChemistryReading | null
}

export default async function ChemistryPage() {
  const profile = await requireUser()
  if (!profile.facility_id) return null

  const supabase = createClient()
  const [{ data: bodies }, { data: facility }, { data: readings }] = await Promise.all([
    supabase
      .from('water_bodies')
      .select('*')
      .eq('facility_id', profile.facility_id)
      .eq('is_active', true)
      .order('sort_order'),
    supabase.from('facilities').select('config, timezone').eq('id', profile.facility_id).single(),
    supabase
      .from('chemistry_readings')
      .select('*')
      .eq('facility_id', profile.facility_id)
      .order('tested_at', { ascending: false })
      .limit(200),
  ])

  const chemDefaults = (facility?.config as { chem_defaults?: ChemDefaults } | null)?.chem_defaults
  const allReadings = (readings ?? []) as ChemistryReading[]

  const statuses: BodyStatus[] = ((bodies ?? []) as WaterBody[]).map((body) => {
    const mine = allReadings.filter((r) => r.water_body_id === body.id)
    return {
      body,
      lastTestedAt: mine[0]?.tested_at ?? null,
      intervalMinutes: resolveTestInterval(chemDefaults, body).minutes,
      openIssue: mine.find((r) => r.status !== 'ok' && !r.corrected_at) ?? null,
    }
  })

  return (
    <ChemistryClient
      statuses={statuses}
      readings={allReadings}
      timeZone={facility?.timezone ?? 'America/Chicago'}
      canManage={isManager(profile.role)}
    />
  )
}
