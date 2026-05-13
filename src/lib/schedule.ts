import { createServiceClient } from '@/lib/supabase/server'
import type { ScheduleRow, ScheduleCell, DailySchedule, CellStatus, Priority, AuditTypeName } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

const AUDIT_TYPES: AuditTypeName[] = ['scanning', 'vat', 'cpr_skills', 'dispatch']
const AUDIT_DISPLAY: Record<AuditTypeName, string> = {
  scanning: 'SCANNING',
  vat: 'VAT',
  cpr_skills: 'CPR / SKILLS',
  dispatch: 'DISPATCH',
  supervisor_eavs: 'EAVS',
  guest_service: 'GUEST SERVICE',
  cleaning: 'CLEANING',
}

function getCellStatus(daysAgo: number | null, cadenceDays: number, completedToday: boolean): CellStatus {
  if (completedToday) return 'done'
  if (daysAgo === null) return 'overdue'
  if (daysAgo > cadenceDays) return 'overdue'
  if (daysAgo >= cadenceDays - 1) return 'due_today'
  return 'ok'
}

function getPriority(overdueCount: number, recentFails: number): Priority {
  if (overdueCount >= 2 || recentFails >= 2) return 'HIGH'
  if (overdueCount === 1 || recentFails === 1) return 'MED'
  return 'ON TRACK'
}

/**
 * Pass the session-scoped supabase client from the calling server component
 * so RLS applies correctly. Falls back to service client if not provided.
 */
export async function getDailySchedule(
  facilityId: string,
  supabaseClient?: SupabaseClient
): Promise<DailySchedule> {
  const supabase = supabaseClient ?? createServiceClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: facility, error: facilityError } = await supabase
    .from('facilities')
    .select('*')
    .eq('id', facilityId)
    .single()

  if (!facility) {
    console.error('Facility query failed:', facilityError)
    return {
      facility: {
        id: facilityId,
        name: 'Aquatic Center',
        cert_body: 'ellis' as const,
        timezone: 'UTC',
        created_at: new Date().toISOString(),
        config: {
          remediation_deadline_hours: 48,
          audit_cadence: { scanning: 7, vat: 30, cpr_skills: 30, dispatch: 30, supervisor_eavs: 30, guest_service: 14, cleaning: 7 },
          zones: ['Main Pool', 'Wave Pool', 'Lazy River', 'Activity Pool', 'Kiddie Pool'],
        },
      },
      date: new Date().toISOString(),
      on_shift: 0, due_today: 0, overdue: 0, done: 0, total: 0, rows: [],
    }
  }

  const cadence = facility.config.audit_cadence as Record<AuditTypeName, number>

  const { data: lifeguards } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('facility_id', facilityId)
    .eq('role', 'lifeguard')
    .eq('is_active', true)
    .order('name')

  if (!lifeguards || lifeguards.length === 0) {
    return { facility, date: new Date().toISOString(), on_shift: 0, due_today: 0, overdue: 0, done: 0, total: 0, rows: [] }
  }

  const lifeguardIds = lifeguards.map((l) => l.id)

  const { data: audits } = await supabase
    .from('audits')
    .select('id, lifeguard_id, audit_type_name, score, passed, submitted_at, zone')
    .in('lifeguard_id', lifeguardIds)
    .eq('facility_id', facilityId)
    .in('status', ['completed', 'remediated', 'closed'])
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })

  const latestAudit: Record<string, Record<string, { id: string; submitted_at: string; passed: boolean | null }>> = {}
  for (const audit of audits ?? []) {
    if (!latestAudit[audit.lifeguard_id]) latestAudit[audit.lifeguard_id] = {}
    if (!latestAudit[audit.lifeguard_id][audit.audit_type_name]) {
      latestAudit[audit.lifeguard_id][audit.audit_type_name] = {
        id: audit.id,
        submitted_at: audit.submitted_at,
        passed: audit.passed,
      }
    }
  }

  let dueCount = 0
  let overdueCount = 0
  let doneCount = 0

  const rows: ScheduleRow[] = lifeguards.map((guard) => {
    const cells: Partial<Record<AuditTypeName, ScheduleCell>> = {}
    let guardOverdue = 0
    let guardFails = 0

    for (const auditType of AUDIT_TYPES) {
      const latest = latestAudit[guard.id]?.[auditType]
      let daysAgo: number | null = null
      let completedToday = false
      let completedTime: string | null = null

      if (latest?.submitted_at) {
        const submittedDate = new Date(latest.submitted_at)
        daysAgo = Math.floor((Date.now() - submittedDate.getTime()) / (1000 * 60 * 60 * 24))
        completedToday = submittedDate >= today
        if (completedToday) {
          completedTime = submittedDate.toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', hour12: true,
          }).toLowerCase()
        }
        if (!latest.passed) guardFails++
      }

      const status = getCellStatus(daysAgo, cadence[auditType] ?? 30, completedToday)
      if (status === 'overdue') { guardOverdue++; overdueCount++ }
      else if (status === 'due_today') dueCount++
      else if (status === 'done') doneCount++

      cells[auditType] = {
        status,
        last_audit_date: latest?.submitted_at ?? null,
        days_ago: daysAgo,
        completed_time: completedTime,
        audit_id: latest?.id ?? null,
      }
    }

    return {
      lifeguard: guard,
      cells: cells as Record<AuditTypeName, ScheduleCell>,
      priority: getPriority(guardOverdue, guardFails),
      overdue_count: guardOverdue,
    }
  })

  rows.sort((a, b) => {
    const order = { HIGH: 0, MED: 1, 'ON TRACK': 2 }
    if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority]
    return b.overdue_count - a.overdue_count
  })

  return {
    facility,
    date: new Date().toISOString(),
    on_shift: lifeguards.length,
    due_today: dueCount,
    overdue: overdueCount,
    done: doneCount,
    total: lifeguards.length * AUDIT_TYPES.length,
    rows,
  }
}

export { AUDIT_TYPES, AUDIT_DISPLAY }
