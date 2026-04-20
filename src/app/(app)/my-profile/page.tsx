import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { MyProfileClient } from './my-profile-client'
import type { Audit, RemediationTask, Certification } from '@/types'

function computeLPR(audits: Audit[]): number {
  const completed = audits.filter((a) => a.passed !== null)
  if (completed.length === 0) return 0
  const passCount = completed.filter((a) => a.passed).length
  // LPR: 1.0–5.0 scale. Base on pass rate + weighting for recency.
  const passRate = passCount / completed.length
  return Math.round((1 + passRate * 4) * 10) / 10
}

export default async function MyProfilePage() {
  const profile = await requireUser()
  const supabase = createClient()

  const [{ data: audits }, { data: remediations }, { data: certifications }] = await Promise.all([
    supabase
      .from('audits')
      .select('*')
      .eq('lifeguard_id', profile.id)
      .in('status', ['completed', 'remediated', 'closed'])
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(50),
    supabase
      .from('remediation_tasks')
      .select('*')
      .eq('lifeguard_id', profile.id)
      .in('status', ['assigned', 'acknowledged', 'in_deck'])
      .order('deadline', { ascending: true }),
    supabase
      .from('certifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('expiry', { ascending: true }),
  ])

  const lpr = computeLPR((audits ?? []) as Audit[])

  return (
    <MyProfileClient
      profile={profile}
      audits={(audits ?? []) as Audit[]}
      remediations={(remediations ?? []) as RemediationTask[]}
      certifications={(certifications ?? []) as Certification[]}
      lpr={lpr}
    />
  )
}
