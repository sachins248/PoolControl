import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { trainingRatelimit } from '@/lib/rate-limit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const AUDIT_TYPE_LABELS: Record<string, string> = {
  scanning: 'Zone Scanning & Visual Surveillance',
  vat: 'Vigilance Awareness Test (VAT)',
  cpr_skills: 'CPR & First Aid Skills',
  dispatch: 'Ride Dispatching Procedures',
  supervisor_eavs: 'EAVS / Camera Audit',
  guest_service: 'Guest Service & Engagement',
  cleaning: 'Cleaning Protocol',
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const serviceClient = createServiceClient()

  // Get the user's facility
  const { data: profile } = await serviceClient
    .from('user_profiles')
    .select('facility_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['supervisor', 'manager', 'director'].includes(profile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { success } = await trainingRatelimit.limit(user.id)
  if (!success) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })

  const facilityId = profile.facility_id

  // Fetch last 90 days of completed audits for the facility
  const since = new Date()
  since.setDate(since.getDate() - 90)

  const [{ data: audits }, { data: lifeguards }] = await Promise.all([
    serviceClient
      .from('audits')
      .select('id, audit_type_name, score, passed, submitted_at')
      .eq('facility_id', facilityId)
      .in('status', ['completed', 'remediated', 'closed'])
      .not('submitted_at', 'is', null)
      .gte('submitted_at', since.toISOString()),
    serviceClient
      .from('user_profiles')
      .select('id, name')
      .eq('facility_id', facilityId)
      .eq('role', 'lifeguard')
      .eq('is_active', true),
  ])

  if (!audits || audits.length === 0) {
    return NextResponse.json({ error: 'Not enough audit data to generate a plan. Complete some audits first.' }, { status: 400 })
  }

  // Fetch criteria results for those audits
  const auditIds = audits.map((a) => a.id)
  const { data: criteria } = await serviceClient
    .from('audit_criteria_results')
    .select('criterion_label, result, audit_id')
    .in('audit_id', auditIds)

  // Build team analytics
  const byType: Record<string, { total: number; passes: number }> = {}
  for (const audit of audits) {
    const t = audit.audit_type_name
    if (!byType[t]) byType[t] = { total: 0, passes: 0 }
    byType[t].total++
    if (audit.passed) byType[t].passes++
  }

  const typeBreakdown = Object.entries(byType)
    .map(([type, { total, passes }]) => ({
      type: AUDIT_TYPE_LABELS[type] ?? type,
      total,
      passRate: Math.round((passes / total) * 100),
    }))
    .sort((a, b) => a.passRate - b.passRate)

  const failureCounts: Record<string, number> = {}
  for (const c of criteria ?? []) {
    if (c.result === 'fail') {
      failureCounts[c.criterion_label] = (failureCounts[c.criterion_label] ?? 0) + 1
    }
  }
  const topFailures = Object.entries(failureCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => `${label} (failed ${count}x)`)

  const teamSize = lifeguards?.length ?? 0
  const totalAudits = audits.length
  const overallPassRate = Math.round((audits.filter((a) => a.passed).length / totalAudits) * 100)
  const worstTypes = typeBreakdown.slice(0, 3).map((t) => `${t.type}: ${t.passRate}% pass rate`)

  const dataContext = `
TEAM OVERVIEW (last 90 days):
- Team size: ${teamSize} lifeguards
- Total audits conducted: ${totalAudits}
- Overall team pass rate: ${overallPassRate}%

WORST-PERFORMING AUDIT TYPES:
${worstTypes.join('\n')}

ALL AUDIT TYPE BREAKDOWN:
${typeBreakdown.map((t) => `- ${t.type}: ${t.passRate}% pass rate (${t.total} audits)`).join('\n')}

TOP FAILURE CRITERIA (most frequently failed):
${topFailures.length > 0 ? topFailures.join('\n') : 'No specific criteria failures recorded yet.'}
`.trim()

  const systemPrompt = `You are a certified aquatics training director AI embedded in PoolControl.ai. You create evidence-based, practical training lesson plans for lifeguard teams at water parks and aquatic facilities.

Your lesson plans must be:
- Grounded in real aquatics safety standards (Ellis & Associates, Red Cross, StarGuard, etc.)
- Practical and executable on a pool deck or in a break room
- Focused on the team's actual documented weaknesses, not generic content
- Structured as a single 60–90 minute team training session

You MUST return valid JSON only. No extra text, no markdown, no explanation outside the JSON.`

  const userPrompt = `Based on this team's performance data, generate a targeted training lesson plan for their most critical area of weakness.

${dataContext}

Return a JSON object with exactly this structure:
{
  "topic": "short training topic title (max 60 chars)",
  "why_this_topic": "2-3 sentences explaining why this is the priority based on the data",
  "priority": "High" | "Medium" | "Low",
  "lesson_plan": {
    "total_duration_minutes": <number between 60 and 90>,
    "steps": [
      {
        "order": 1,
        "title": "step title",
        "description": "detailed description of what to do, what to say, what to look for",
        "duration_minutes": <number>,
        "drill_type": "briefing" | "demonstration" | "practice" | "scenario" | "debrief" | "assessment"
      }
    ]
  }
}

Requirements:
- 5–8 steps total
- step durations must sum to total_duration_minutes
- steps should follow a logical training arc: intro → demonstration → practice → scenario → debrief
- descriptions should be 2-4 sentences max — specific and actionable, not exhaustive
- tie the content directly to the failure criteria in the data`

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const rawText = response.content[0].type === 'text' ? response.content[0].text : ''

  let parsed
  try {
    // Extract JSON — handle markdown fences, leading text, trailing text
    const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/)
    const jsonStr = fenceMatch ? fenceMatch[1] : rawText
    // Find the outermost { } block in case there's surrounding text
    const objMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (!objMatch) throw new Error('No JSON object found')
    parsed = JSON.parse(objMatch[0])
  } catch {
    console.error('Training plan parse error. Raw response:', rawText)
    return NextResponse.json({ error: 'AI returned invalid JSON. Please try again.' }, { status: 500 })
  }

  return NextResponse.json(parsed)
}
