import { requireUser, isManager } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AnalyticsClient } from './analytics-client'
import type { AuditTypeName, LiabilityModel } from '@/types'

export interface TrendBucket {
  label: string
  avg: number | null
  n: number
}

export interface GuardSeries {
  id: string
  name: string
  points: { daysAgo: number; score: number; passed: boolean; type: string }[]
}

/**
 * A fail → later-pass pair on the same criterion for the same guard.
 * Inferred purely from consecutive `audits` rows — it never consults
 * `remediation_tasks`, so it is a *recovery*, not a verified remediation.
 */
export interface RecoveryArc {
  guardName: string
  type: string
  before: number
  after: number
  daysBetween: number
}

const CORE_TYPES: AuditTypeName[] = ['scanning', 'vat', 'cpr_skills', 'dispatch']
const WEEKS = 14

export default async function AnalyticsPage() {
  const profile = await requireUser()
  if (!isManager(profile.role) && profile.role !== 'super_admin') redirect('/schedule')
  if (!profile.facility_id) return null

  const supabase = createClient()

  const [{ data: audits }, { data: guards }, { data: facility }, { data: incidentRows }] = await Promise.all([
    supabase
      .from('audits')
      .select('lifeguard_id, audit_type_name, score, passed, submitted_at')
      .eq('facility_id', profile.facility_id)
      .in('status', ['completed', 'remediated', 'closed'])
      .not('submitted_at', 'is', null)
      .not('score', 'is', null)
      .order('submitted_at', { ascending: true }),
    supabase
      .from('user_profiles')
      .select('id, name')
      .eq('facility_id', profile.facility_id)
      .eq('role', 'lifeguard')
      .eq('is_active', true),
    supabase
      .from('facilities')
      .select('config')
      .eq('id', profile.facility_id)
      .single(),
    supabase
      .from('incidents')
      .select('kind, severity, occurred_at, ems_called')
      .eq('facility_id', profile.facility_id)
      .neq('status', 'draft')
      .order('occurred_at', { ascending: false }),
  ])

  const liabilityModel = (facility?.config?.liability_model ?? null) as LiabilityModel | null

  // Real incident counts, replacing the recovery-arc count that stood in for
  // them while there was no incident data at all.
  const incidents = incidentRows ?? []
  const incidentStats = {
    total: incidents.length,
    saves: incidents.filter((i) => i.kind === 'save').length,
    severe: incidents.filter((i) => i.severity === 'severe').length,
    emsCalls: incidents.filter((i) => i.ems_called).length,
  }

  const guardName = new Map((guards ?? []).map((g) => [g.id, g.name]))
  const rows = (audits ?? []).filter((a) => guardName.has(a.lifeguard_id))
  const now = Date.now()

  // ── Weekly trend buckets per audit type (oldest → newest) ──────────────────
  const trends: Record<string, TrendBucket[]> = {}
  for (const type of CORE_TYPES) {
    const buckets: TrendBucket[] = []
    for (let w = WEEKS - 1; w >= 0; w--) {
      const startDaysAgo = (w + 1) * 7
      const endDaysAgo = w * 7
      const inBucket = rows.filter((a) => {
        if (a.audit_type_name !== type) return false
        const daysAgo = (now - new Date(a.submitted_at!).getTime()) / 86400000
        return daysAgo < startDaysAgo && daysAgo >= endDaysAgo
      })
      buckets.push({
        label: w === 0 ? 'now' : `-${w}w`,
        avg: inBucket.length > 0 ? inBucket.reduce((s, a) => s + a.score!, 0) / inBucket.length : null,
        n: inBucket.length,
      })
    }
    trends[type] = buckets
  }

  // ── Per-guard series (guards with enough history to chart) ─────────────────
  const byGuard = new Map<string, GuardSeries>()
  for (const a of rows) {
    if (!byGuard.has(a.lifeguard_id)) {
      byGuard.set(a.lifeguard_id, { id: a.lifeguard_id, name: guardName.get(a.lifeguard_id)!, points: [] })
    }
    byGuard.get(a.lifeguard_id)!.points.push({
      daysAgo: Math.round((now - new Date(a.submitted_at!).getTime()) / 86400000),
      score: a.score!,
      passed: a.passed === true,
      type: a.audit_type_name,
    })
  }
  const guardSeries = Array.from(byGuard.values())
    .filter((g) => g.points.length >= 4)
    .sort((a, b) => a.name.localeCompare(b.name))

  // ── Recovery arcs: failed audit → later passed audit of the same type ──────
  const arcs: RecoveryArc[] = []
  for (const g of Array.from(byGuard.values())) {
    for (const type of CORE_TYPES) {
      const seq = g.points
        .filter((p) => p.type === type)
        .sort((a, b) => b.daysAgo - a.daysAgo) // oldest first
      for (let i = 0; i < seq.length; i++) {
        if (!seq[i].passed) {
          const recovery = seq.slice(i + 1).find((p) => p.passed)
          if (recovery) {
            arcs.push({
              guardName: g.name,
              type,
              before: seq[i].score,
              after: recovery.score,
              daysBetween: seq[i].daysAgo - recovery.daysAgo,
            })
            break // one arc per guard×type keeps the chart honest
          }
        }
      }
    }
  }
  arcs.sort((a, b) => (b.after - b.before) - (a.after - a.before))

  // ── Team pass rate: first half of window vs second half ────────────────────
  const oldest = rows.length > 0 ? (now - new Date(rows[0].submitted_at!).getTime()) / 86400000 : 0
  const midpoint = oldest / 2
  const early = rows.filter((a) => (now - new Date(a.submitted_at!).getTime()) / 86400000 >= midpoint)
  const recent = rows.filter((a) => (now - new Date(a.submitted_at!).getTime()) / 86400000 < midpoint)
  const passRate = (xs: typeof rows) => xs.length > 0 ? xs.filter((a) => a.passed).length / xs.length : 0

  return (
    <AnalyticsClient
      trends={trends}
      guardSeries={guardSeries}
      arcs={arcs}
      teamBefore={passRate(early)}
      teamAfter={passRate(recent)}
      windowDays={Math.round(oldest)}
      totalAudits={rows.length}
      liabilityModel={liabilityModel}
      incidentStats={incidentStats}
      canConfigure={isManager(profile.role)}
    />
  )
}
