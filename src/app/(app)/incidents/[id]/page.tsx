import { requireUser, isManager } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { IncidentDetailClient } from './incident-detail-client'
import type { Incident, IncidentAmendment } from '@/types'

export default async function IncidentDetailPage({ params }: { params: { id: string } }) {
  const profile = await requireUser()
  if (!profile.facility_id) return null

  const supabase = createClient()

  const { data: incident } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!incident) notFound()

  const [{ data: responders }, { data: amendments }, { data: facility }, { data: bodies }] =
    await Promise.all([
      supabase
        .from('incident_responders')
        .select('id, user_id, role, user_profiles!incident_responders_user_id_fkey(name)')
        .eq('incident_id', params.id),
      supabase
        .from('incident_amendments')
        .select('*, user_profiles!incident_amendments_author_id_fkey(name)')
        .eq('incident_id', params.id)
        .order('seq'),
      supabase.from('facilities').select('timezone').eq('id', profile.facility_id).single(),
      supabase.from('water_bodies').select('id, name').eq('facility_id', profile.facility_id),
    ])

  const bodyName = (bodies ?? []).find((b) => b.id === incident.water_body_id)?.name ?? null

  return (
    <IncidentDetailClient
      incident={incident as Incident}
      responders={(responders ?? []).map((r) => ({
        id: r.id as string,
        role: r.role as string,
        name: (r.user_profiles as { name?: string } | null)?.name ?? 'Unknown',
      }))}
      amendments={(amendments ?? []).map((a) => ({
        ...(a as unknown as IncidentAmendment),
        authorName: (a.user_profiles as { name?: string } | null)?.name ?? 'Unknown',
      }))}
      waterBodyName={bodyName}
      timeZone={facility?.timezone ?? 'America/Chicago'}
      canReview={isManager(profile.role)}
      canAmend={isManager(profile.role) || profile.role === 'supervisor'}
    />
  )
}
