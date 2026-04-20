import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CERT_BODY_NAMES: Record<string, string> = {
  ellis: 'Ellis & Associates',
  red_cross: 'American Red Cross',
  starguard: 'StarGuard Elite',
  ymca: 'YMCA',
  jeff_ellis: 'Jeff Ellis Management',
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { failed_criteria, cert_body, lifeguard_name, criteria_definitions } = await req.json()

  if (!failed_criteria || failed_criteria.length === 0) {
    return NextResponse.json([])
  }

  const certName = CERT_BODY_NAMES[cert_body] ?? cert_body

  // Build context for each failed criterion
  type FailedCriterion = { criterion_id: string; criterion_label: string; result: string }
  type CriterionDef = { id: string; what_to_look_for: string[]; common_failures: string[]; liability_weight: string }

  const failedDetails = (failed_criteria as FailedCriterion[]).map((r) => {
    const def = (criteria_definitions as CriterionDef[])?.find((c) => c.id === r.criterion_id)
    return {
      label: r.criterion_label,
      result: r.result,
      what_to_look_for: def?.what_to_look_for ?? [],
      common_failures: def?.common_failures ?? [],
      liability_weight: def?.liability_weight ?? 'standard',
    }
  })

  const prompt = `You are Coach PC, an AI audit assistant for PoolControl.ai used in ${certName}-certified aquatic facilities.

A supervisor just completed an audit of ${lifeguard_name} and needs coaching points to discuss with the lifeguard.

Failed/needs attention criteria:
${failedDetails.map((d, i) => `${i + 1}. "${d.label}" (${d.result}) [${d.liability_weight} liability weight]
   Common failures: ${d.common_failures.join(', ')}`).join('\n')}

Generate exactly ${failedDetails.length} coaching point(s) — one per failed criterion, in the same order.

Each coaching point must be:
- Specific to what the guard actually failed (not generic)
- Actionable: tell the supervisor what to have the guard DO during remediation
- Referenced to ${certName} standards
- 2–3 sentences max

Respond ONLY with a valid JSON array, no markdown, no preamble:
[
  {
    "title": "Short topic title (3-5 words)",
    "description": "Specific coaching guidance for the supervisor to deliver to ${lifeguard_name}..."
  }
]`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    messages: [{ role: 'user', content: prompt }],
  })

  try {
    const content = message.content[0]
    if (content.type !== 'text') return NextResponse.json([])
    const parsed = JSON.parse(content.text.trim())
    return NextResponse.json(Array.isArray(parsed) ? parsed : [])
  } catch {
    return NextResponse.json([])
  }
}
