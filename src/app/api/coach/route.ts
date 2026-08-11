import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { checkLimit, coachRatelimit } from '@/lib/rate-limit'

const coachSchema = z.object({
  criterion: z.object({
    label: z.string().max(300),
    liability_weight: z.string().max(50),
  }),
  audit_type: z.string().max(50),
  lifeguard_name: z.string().max(100),
  zone: z.string().max(100).optional(),
  lifeguard_id: z.string().uuid().optional(),
})

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const AUDIT_TYPE_CONTEXT: Record<string, string> = {
  scanning: 'Zone Scanning',
  vat: 'Vigilance Awareness Test',
  cpr_skills: 'CPR & First Aid',
  dispatch: 'Ride Dispatching',
  supervisor_eavs: 'EAVS Camera Audit',
  guest_service: 'Guest Service',
  cleaning: 'Cleaning Protocol',
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { success } = await checkLimit(coachRatelimit, user.id)
  if (!success) return new Response('Too Many Requests', { status: 429 })

  const parsed = coachSchema.safeParse(await req.json())
  if (!parsed.success) return new Response('Bad Request', { status: 400 })
  const { criterion, audit_type, lifeguard_name, zone, lifeguard_id } = parsed.data

  // Fetch this guard's top recurring failures (last 6 months)
  let knownWeaknesses: string[] = []
  if (lifeguard_id) {
    const serviceClient = createServiceClient()

    // Verify caller's facility before querying another guard's data
    const { data: callerProfile } = await serviceClient
      .from('user_profiles')
      .select('facility_id')
      .eq('id', user.id)
      .single()

    const since = new Date()
    since.setMonth(since.getMonth() - 6)

    const { data: failedCriteria } = callerProfile?.facility_id ? await serviceClient
      .from('audit_criteria_results')
      .select('criterion_label, audits!inner(lifeguard_id, submitted_at, facility_id)')
      .eq('audits.lifeguard_id', lifeguard_id)
      .eq('audits.facility_id', callerProfile.facility_id)
      .eq('result', 'fail')
      .gte('audits.submitted_at', since.toISOString())
      .limit(50) : { data: null }

    if (failedCriteria && failedCriteria.length > 0) {
      const counts: Record<string, number> = {}
      for (const row of failedCriteria) {
        counts[row.criterion_label] = (counts[row.criterion_label] ?? 0) + 1
      }
      knownWeaknesses = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([label, count]) => `${label} (failed ${count}x)`)
    }
  }

  const auditTypeName = AUDIT_TYPE_CONTEXT[audit_type] ?? audit_type
  const weaknessContext = knownWeaknesses.length > 0
    ? `Known weak areas: ${knownWeaknesses.join(', ')}.`
    : 'No prior failure history on record.'

  const systemPrompt = `You are Coach PC — a sharp, fast aquatics audit assistant. You give supervisors a single punchy observation (max 2 sentences, 35 words) while they're standing on the pool deck.

Rules:
- Be specific to the zone/pool and this guard's known history
- Tell the supervisor exactly WHERE to look and WHAT to catch
- Reference the guard's weak areas only if relevant to this criterion
- Never explain what the criterion is — they already know
- No filler, no "make sure to", no headers`

  const userPrompt = `Guard: ${lifeguard_name}
Zone: ${zone ?? 'unspecified'}
Audit type: ${auditTypeName}
Criterion: "${criterion.label}"
Liability: ${criterion.liability_weight}
${weaknessContext}

Give one sharp observation (max 2 sentences, 35 words). What should the supervisor look for RIGHT NOW, specific to this guard and this zone?`

  const stream = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 100,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    stream: true,
  })

  const encoder = new TextEncoder()
  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          controller.enqueue(encoder.encode(event.delta.text))
        }
        if (event.type === 'message_stop') controller.close()
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
