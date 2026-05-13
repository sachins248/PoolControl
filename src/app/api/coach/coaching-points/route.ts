import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { coachingPointsRatelimit } from '@/lib/rate-limit'

const coachingPointsSchema = z.object({
  failed_criteria: z.array(z.object({
    criterion_id: z.string().max(100),
    criterion_label: z.string().max(300),
    result: z.enum(['fail', 'needs_attention']),
  })).min(1).max(30),
  cert_body: z.string().max(50),
  lifeguard_name: z.string().max(100),
  audit_type: z.string().max(50).optional(),
  criteria_definitions: z.array(z.object({
    id: z.string().max(100),
    what_to_look_for: z.array(z.string().max(500)),
    common_failures: z.array(z.string().max(500)),
    liability_weight: z.string().max(50),
  })).optional(),
})

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

  const { success } = await coachingPointsRatelimit.limit(user.id)
  if (!success) return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })

  const parsed = coachingPointsSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ error: 'Bad Request' }, { status: 400 })
  const { failed_criteria, cert_body, lifeguard_name, criteria_definitions } = parsed.data

  const certName = CERT_BODY_NAMES[cert_body] ?? cert_body

  const failedDetails = failed_criteria.map((r) => {
    const def = criteria_definitions?.find((c) => c.id === r.criterion_id)
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
