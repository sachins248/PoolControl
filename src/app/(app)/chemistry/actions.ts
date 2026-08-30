'use server'

import { revalidatePath } from 'next/cache'
import { requireUserForAction, isManager } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { sendChemistryWebhooks } from '@/lib/webhooks'
import { evaluateReading, resolveThresholds, describeBreach } from '@/lib/chemistry'
import type { ChemDefaults, ChemParam, WaterBody } from '@/types'

export interface ReadingInput {
  waterBodyId: string
  values: Partial<Record<ChemParam, string>>
  notes: string
  /** Set when this reading is a retest following a correction. */
  retestOf?: string | null
}

export async function logReading(input: ReadingInput): Promise<{ error?: string; status?: string }> {
  const { profile } = await requireUserForAction()
  if (!profile.facility_id) return { error: 'Unauthorized' }

  const service = createServiceClient()

  const [{ data: body }, { data: facility }] = await Promise.all([
    service.from('water_bodies').select('*').eq('id', input.waterBodyId).single(),
    service.from('facilities').select('name, config, timezone').eq('id', profile.facility_id).single(),
  ])

  if (!body || body.facility_id !== profile.facility_id) {
    return { error: 'Unknown water body.' }
  }

  const config = (facility?.config ?? {}) as Record<string, unknown>
  const chemDefaults = config.chem_defaults as ChemDefaults | undefined
  const { thresholds } = resolveThresholds(chemDefaults, body as WaterBody)

  // Parse only what was actually entered — a blank field is "not measured",
  // which is different from zero.
  const numeric: Partial<Record<ChemParam, number | null>> = {}
  for (const [k, raw] of Object.entries(input.values)) {
    if (raw === undefined || raw === '') continue
    const n = Number(raw)
    if (Number.isNaN(n)) return { error: `"${raw}" is not a number.` }
    numeric[k as ChemParam] = n
  }
  if (Object.keys(numeric).length === 0) return { error: 'Enter at least one reading.' }

  const { status, breaches } = evaluateReading(numeric, thresholds)

  const { error } = await service.from('chemistry_readings').insert({
    facility_id: profile.facility_id,
    water_body_id: input.waterBodyId,
    tested_by_id: profile.id,
    ...numeric,
    status,
    breaches,
    thresholds_snapshot: thresholds,
    notes: input.notes.trim() || null,
    retest_of: input.retestOf || null,
  })

  if (error) return { error: error.message }

  await alert(
    { slack: config.slack_webhook_url as string, teams: config.teams_webhook_url as string },
    {
      service,
      facilityId: profile.facility_id,
      facilityName: facility?.name ?? 'Your Facility',
      bodyName: body.name,
      bodyId: body.id,
      status,
      breachLines: breaches.map(describeBreach),
      testedBy: profile.name,
      timeZone: facility?.timezone ?? 'America/Chicago',
      isRetest: Boolean(input.retestOf),
    },
  )

  revalidatePath('/chemistry')
  return { status }
}

/**
 * Alerting policy: a closure always fires. A plain out-of-range fires only if
 * there isn't already an open issue on that body — otherwise a
 * test → dose → retest cycle sprays four messages and everyone mutes the channel.
 */
async function alert(
  urls: { slack?: string | null; teams?: string | null },
  ctx: {
    service: ReturnType<typeof createServiceClient>
    facilityId: string
    facilityName: string
    bodyName: string
    bodyId: string
    status: string
    breachLines: string[]
    testedBy: string
    timeZone: string
    isRetest: boolean
  },
) {
  if (!urls.slack && !urls.teams) return

  try {
    if (ctx.status === 'closure_required') {
      await fire('closure_required')
      return
    }

    if (ctx.status === 'out_of_range') {
      const { count } = await ctx.service
        .from('chemistry_readings')
        .select('id', { count: 'exact', head: true })
        .eq('water_body_id', ctx.bodyId)
        .neq('status', 'ok')
        .is('corrected_at', null)
      // count includes the row just inserted; >1 means an issue was already open.
      if ((count ?? 0) <= 1) await fire('out_of_range')
      return
    }

    // Back in range — only worth saying if it resolves something.
    if (ctx.status === 'ok' && ctx.isRetest) await fire('cleared')
  } catch {
    // Never block a reading on a webhook.
  }

  async function fire(status: 'out_of_range' | 'closure_required' | 'cleared') {
    await sendChemistryWebhooks(urls, {
      facilityName: ctx.facilityName,
      waterBodyName: ctx.bodyName,
      status,
      breachLines: ctx.breachLines,
      testedBy: ctx.testedBy,
      testedAt: new Date().toLocaleString('en-US', { timeZone: ctx.timeZone }),
    })
  }
}

export async function markCorrected(
  readingId: string,
  correctiveNote: string,
): Promise<{ error?: string }> {
  const { profile } = await requireUserForAction()
  if (!profile.facility_id) return { error: 'Unauthorized' }

  const service = createServiceClient()
  const { error } = await service
    .from('chemistry_readings')
    .update({
      corrected_at: new Date().toISOString(),
      corrected_by_id: profile.id,
      corrective_note: correctiveNote.trim() || null,
    })
    .eq('id', readingId)
    .eq('facility_id', profile.facility_id)

  if (error) return { error: error.message }
  revalidatePath('/chemistry')
  return {}
}

export async function saveWaterBody(input: {
  id?: string
  name: string
  kind: string
  testIntervalMinutes: number
}): Promise<{ error?: string }> {
  const { profile } = await requireUserForAction()
  if (!isManager(profile.role) || !profile.facility_id) {
    return { error: 'Only a manager or director can change water bodies.' }
  }
  if (!input.name.trim()) return { error: 'Name is required.' }

  const service = createServiceClient()

  if (input.id) {
    const { data: existing } = await service
      .from('water_bodies').select('config').eq('id', input.id).single()
    const cfg = { ...((existing?.config ?? {}) as Record<string, unknown>), test_interval_minutes: input.testIntervalMinutes }
    const { error } = await service
      .from('water_bodies')
      .update({ name: input.name.trim(), kind: input.kind, config: cfg })
      .eq('id', input.id)
      .eq('facility_id', profile.facility_id)
    if (error) return { error: error.message }
  } else {
    const { error } = await service.from('water_bodies').insert({
      facility_id: profile.facility_id,
      name: input.name.trim(),
      kind: input.kind,
      config: { test_interval_minutes: input.testIntervalMinutes },
    })
    if (error) return { error: error.message }
  }

  await syncZonesMirror(service, profile.facility_id)
  revalidatePath('/chemistry')
  revalidatePath('/audits/new')
  return {}
}

/**
 * facilities.config.zones is now derived. The audit form and schedule.ts still
 * read it, so it's kept in step rather than migrated in one risky sweep.
 */
async function syncZonesMirror(
  service: ReturnType<typeof createServiceClient>,
  facilityId: string,
) {
  const [{ data: bodies }, { data: facility }] = await Promise.all([
    service.from('water_bodies').select('name').eq('facility_id', facilityId).eq('is_active', true).order('sort_order'),
    service.from('facilities').select('config').eq('id', facilityId).single(),
  ])
  const config = (facility?.config ?? {}) as Record<string, unknown>
  await service
    .from('facilities')
    .update({ config: { ...config, zones: (bodies ?? []).map((b) => b.name) } })
    .eq('id', facilityId)
}
