import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { CoachPCRequest } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CERT_BODY_NAMES: Record<string, string> = {
  ellis: 'Ellis & Associates',
  red_cross: 'American Red Cross',
  starguard: 'StarGuard Elite',
  ymca: 'YMCA',
  jeff_ellis: 'Jeff Ellis Management',
}

const AUDIT_TYPE_CONTEXT: Record<string, string> = {
  scanning: 'Visual Surveillance / Zone Scanning',
  vat: 'Vigilance Awareness Test (simulated drowning)',
  cpr_skills: 'CPR / First Aid Skills Assessment',
  dispatch: 'Ride Dispatching Procedures',
  supervisor_eavs: 'Supervisor / EAVS Camera Audit',
  guest_service: 'Guest Service / Engagement',
  cleaning: 'Cleaning Protocol',
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const body: CoachPCRequest = await req.json()
  const { criterion, audit_type, cert_body, current_results, lifeguard_name, zone } = body

  const certName = CERT_BODY_NAMES[cert_body] ?? cert_body
  const auditTypeName = AUDIT_TYPE_CONTEXT[audit_type] ?? audit_type
  const failedSoFar = current_results.filter((r) => r.result === 'fail').length
  const needsAttnSoFar = current_results.filter((r) => r.result === 'needs_attention').length

  const systemPrompt = `You are Coach PC, an AI audit assistant embedded in PoolControl.ai — a lifeguard performance management platform for aquatic facilities.

Your role: Guide supervisors through ${certName} audits of lifeguard performance. You are currently assisting with a ${auditTypeName} audit.

Rules:
- Ground every response in ${certName} documented standards. Never invent standards.
- Be concise and practical — supervisors are on a pool deck with limited time.
- Use plain language, no jargon.
- Never override supervisor judgment. Surface information, supervisor decides.
- If the guard is already doing well on prior criteria, briefly acknowledge context.

Current audit context:
- Lifeguard being audited: ${lifeguard_name}
- Zone: ${zone ?? 'unspecified'}
- Results so far: ${failedSoFar} fail(s), ${needsAttnSoFar} needs attention`

  const userPrompt = `The supervisor is currently evaluating this criterion:

"${criterion.label}"

Criterion description: ${criterion.description}
Liability weight: ${criterion.liability_weight}
What to look for: ${criterion.what_to_look_for.join('; ')}
Common failures: ${criterion.common_failures.join('; ')}

Provide brief, practical guidance in 2–3 sentences. Tell the supervisor:
1. Exactly what to observe right now
2. Why this criterion matters (tie to liability or safety outcome if high/critical weight)

Keep it under 60 words. No bullet points — just clear guidance they can read in 10 seconds while watching the pool.`

  const stream = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    stream: true,
  })

  const encoder = new TextEncoder()

  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (
          event.type === 'content_block_delta' &&
          event.delta.type === 'text_delta'
        ) {
          controller.enqueue(encoder.encode(event.delta.text))
        }
        if (event.type === 'message_stop') {
          controller.close()
        }
      }
    },
  })

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
