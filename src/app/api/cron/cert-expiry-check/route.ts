import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const ALERT_DAYS = [30, 14, 7, 1]

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const supabase = createServiceClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let totalAlerts = 0

  for (const days of ALERT_DAYS) {
    const targetDate = new Date(today)
    targetDate.setDate(today.getDate() + days)
    const dateStr = targetDate.toISOString().split('T')[0]

    // Find certs expiring on exactly this date, join guard + facility info
    const { data: certs } = await supabase
      .from('certifications')
      .select(`
        body,
        expiry,
        user_profiles!inner (
          id,
          name,
          facility_id,
          is_active
        )
      `)
      .eq('expiry', dateStr)
      .eq('user_profiles.is_active', true)

    if (!certs || certs.length === 0) continue

    // Group by facility
    const byFacility: Record<string, { facilityId: string; guards: { name: string; body: string; expiry: string }[] }> = {}
    for (const cert of certs) {
      const profile = cert.user_profiles as unknown as { id: string; name: string; facility_id: string; is_active: boolean }
      const fid = profile.facility_id
      if (!byFacility[fid]) byFacility[fid] = { facilityId: fid, guards: [] }
      byFacility[fid].guards.push({ name: profile.name, body: cert.body, expiry: cert.expiry })
    }

    // For each facility, email all managers/directors
    for (const { facilityId, guards } of Object.values(byFacility)) {
      const { data: facility } = await supabase
        .from('facilities')
        .select('name')
        .eq('id', facilityId)
        .single()

      const { data: managers } = await supabase
        .from('user_profiles')
        .select('email, name')
        .eq('facility_id', facilityId)
        .in('role', ['manager', 'director'])
        .eq('is_active', true)

      if (!managers || managers.length === 0) continue

      const guardList = guards
        .map((g) => `• ${g.name} — ${g.body.replace('_', ' ').toUpperCase()} (expires ${g.expiry})`)
        .join('\n')

      const subject = days === 1
        ? `⚠️ URGENT: ${guards.length} certification(s) expire TOMORROW at ${facility?.name}`
        : `Certification expiry alert: ${days} days remaining at ${facility?.name}`

      const body = `Hi,

The following lifeguard certification(s) at ${facility?.name} expire in ${days} day${days === 1 ? '' : 's'}:

${guardList}

Please ensure these certifications are renewed before the expiry date to maintain compliance and avoid liability gaps.

— PoolControl.ai`

      for (const manager of managers) {
        await resend.emails.send({
          from: 'PoolControl.ai <alerts@poolcontrol.ai>',
          to: manager.email,
          subject,
          text: body,
        })
        totalAlerts++
      }
    }
  }

  return NextResponse.json({ ok: true, alertsSent: totalAlerts })
}
