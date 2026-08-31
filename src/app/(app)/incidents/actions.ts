'use server'

import { revalidatePath } from 'next/cache'
import { requireUserForAction, isManager } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/server'
import { sendIncidentWebhooks } from '@/lib/webhooks'
import type { IncidentKind, IncidentSeverity, ResponderRole } from '@/types'

function canFile(role: string) {
  return isManager(role) || role === 'supervisor'
}

const KIND_LABEL: Record<IncidentKind, string> = {
  save: 'Save / rescue',
  assist: 'Assist',
  first_aid: 'First aid',
  medical_emergency: 'Medical emergency',
  guest_injury: 'Guest injury',
  other: 'Other',
}

export interface IncidentInput {
  occurredAt: string
  waterBodyId: string | null
  kind: IncidentKind
  severity: IncidentSeverity
  guestName: string
  guestAge: string
  narrative: string
  actionsTaken: string
  emsCalled: boolean
  outcome: string
  witnesses: string
  responders: { userId: string; role: ResponderRole }[]
  /** false files it immediately; true keeps it editable. */
  asDraft: boolean
}

export async function createIncident(input: IncidentInput): Promise<{ id?: string; error?: string }> {
  const { profile } = await requireUserForAction()
  if (!canFile(profile.role) || !profile.facility_id) {
    return { error: 'Only supervisors and managers can file incidents.' }
  }
  if (!input.narrative.trim()) return { error: 'A narrative is required.' }
  if (!input.occurredAt) return { error: 'When it happened is required.' }

  const service = createServiceClient()
  const submitting = !input.asDraft

  const { data: incident, error } = await service
    .from('incidents')
    .insert({
      facility_id: profile.facility_id,
      water_body_id: input.waterBodyId || null,
      occurred_at: new Date(input.occurredAt).toISOString(),
      kind: input.kind,
      severity: input.severity,
      guest_name: input.guestName.trim() || null,
      guest_age: input.guestAge ? Number(input.guestAge) : null,
      narrative: input.narrative.trim(),
      actions_taken: input.actionsTaken.trim() || null,
      ems_called: input.emsCalled,
      outcome: input.outcome.trim() || null,
      witnesses: input.witnesses.trim() || null,
      status: submitting ? 'submitted' : 'draft',
      reported_by_id: profile.id,
      submitted_at: submitting ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (error || !incident) return { error: error?.message ?? 'Could not save the incident.' }

  const responders = input.responders.filter((r) => r.userId)
  if (responders.length > 0) {
    const { error: rErr } = await service.from('incident_responders').insert(
      responders.map((r) => ({ incident_id: incident.id, user_id: r.userId, role: r.role })),
    )
    if (rErr) {
      // Roll back rather than leave a filed incident with no responders on it.
      await service.from('incidents').delete().eq('id', incident.id)
      return { error: rErr.message }
    }
  }

  if (submitting) await notify(service, incident.id, profile.facility_id, profile.name)

  revalidatePath('/incidents')
  revalidatePath('/analytics')
  return { id: incident.id }
}

async function notify(
  service: ReturnType<typeof createServiceClient>,
  incidentId: string,
  facilityId: string,
  reportedBy: string,
) {
  try {
    const [{ data: facility }, { data: inc }] = await Promise.all([
      service.from('facilities').select('name, config, timezone').eq('id', facilityId).single(),
      service
        .from('incidents')
        .select('kind, severity, ems_called, occurred_at, water_bodies(name)')
        .eq('id', incidentId)
        .single(),
    ])
    const config = (facility?.config ?? {}) as Record<string, string>
    if (!config.slack_webhook_url && !config.teams_webhook_url) return

    await sendIncidentWebhooks(
      { slack: config.slack_webhook_url, teams: config.teams_webhook_url },
      {
        facilityName: facility?.name ?? 'Your Facility',
        kindLabel: KIND_LABEL[(inc?.kind ?? 'other') as IncidentKind],
        severity: inc?.severity ?? 'minor',
        waterBodyName: (inc?.water_bodies as { name?: string } | null)?.name ?? 'Unspecified',
        reportedBy,
        occurredAt: inc?.occurred_at
          ? new Date(inc.occurred_at).toLocaleString('en-US', { timeZone: facility?.timezone ?? 'America/Chicago' })
          : '',
        emsCalled: inc?.ems_called ?? false,
        incidentId,
      },
    )
  } catch {
    // Never block filing an incident on a webhook.
  }
}

export async function submitIncident(incidentId: string): Promise<{ error?: string }> {
  const { profile } = await requireUserForAction()
  if (!canFile(profile.role) || !profile.facility_id) return { error: 'Unauthorized' }

  const service = createServiceClient()
  const { error } = await service
    .from('incidents')
    .update({ status: 'submitted', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', incidentId)
    .eq('facility_id', profile.facility_id)
    .eq('status', 'draft')

  if (error) return { error: error.message }
  await notify(service, incidentId, profile.facility_id, profile.name)

  revalidatePath('/incidents')
  revalidatePath(`/incidents/${incidentId}`)
  return {}
}

/**
 * Filed reports are never edited — corrections are appended as numbered,
 * attributed addenda so the original stays discoverable.
 */
export async function addAmendment(incidentId: string, body: string): Promise<{ error?: string }> {
  const { profile } = await requireUserForAction()
  if (!canFile(profile.role) || !profile.facility_id) return { error: 'Unauthorized' }
  if (!body.trim()) return { error: 'Amendment text is required.' }

  const service = createServiceClient()
  const { data: existing } = await service
    .from('incident_amendments')
    .select('seq')
    .eq('incident_id', incidentId)
    .order('seq', { ascending: false })
    .limit(1)

  const nextSeq = (existing?.[0]?.seq ?? 0) + 1

  const { error } = await service.from('incident_amendments').insert({
    incident_id: incidentId,
    seq: nextSeq,
    body: body.trim(),
    author_id: profile.id,
  })

  if (error) return { error: error.message }
  revalidatePath(`/incidents/${incidentId}`)
  return {}
}

export async function reviewIncident(
  incidentId: string,
  input: { reviewNotes: string; correctiveAction: string; close: boolean },
): Promise<{ error?: string }> {
  const { profile } = await requireUserForAction()
  if (!isManager(profile.role) || !profile.facility_id) {
    return { error: 'Only a manager or director can review incidents.' }
  }

  const service = createServiceClient()
  const { error } = await service
    .from('incidents')
    .update({
      status: input.close ? 'closed' : 'under_review',
      reviewed_by_id: profile.id,
      review_notes: input.reviewNotes.trim() || null,
      corrective_action: input.correctiveAction.trim() || null,
      closed_at: input.close ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', incidentId)
    .eq('facility_id', profile.facility_id)

  if (error) return { error: error.message }
  revalidatePath(`/incidents/${incidentId}`)
  revalidatePath('/incidents')
  return {}
}
