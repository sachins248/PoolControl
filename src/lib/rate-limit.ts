import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

type Algorithm = ReturnType<typeof Ratelimit.slidingWindow>

// Redis.fromEnv() throws when the Upstash env vars are missing, which would take down
// every route that imports this module. Degrade to "no limiter" instead.
let redis: Redis | null = null
try {
  redis = Redis.fromEnv()
} catch {
  console.warn('[rate-limit] Upstash not configured — rate limiting disabled')
}

function limiterFor(limiter: Algorithm, prefix: string): Ratelimit | null {
  return redis ? new Ratelimit({ redis, limiter, prefix }) : null
}

// Coach PC streaming — called once per criterion during an audit
export const coachRatelimit = limiterFor(
  Ratelimit.slidingWindow(120, '10 m'),
  'poolcontrol:coach',
)

// Coaching points — called once per completed audit
export const coachingPointsRatelimit = limiterFor(
  Ratelimit.slidingWindow(30, '10 m'),
  'poolcontrol:coaching_points',
)

// Training plan generation — expensive, used rarely
export const trainingRatelimit = limiterFor(
  Ratelimit.slidingWindow(10, '1 h'),
  'poolcontrol:training',
)

// Public, unauthenticated join-code lookup/register — keyed by IP, not user id.
// Higher abuse exposure than the authenticated limiters above since anyone can
// hit these, but an 8-char/29-symbol code keyspace makes brute-forcing past
// even this generous a limit infeasible.
export const joinLookupRatelimit = limiterFor(
  Ratelimit.slidingWindow(10, '10 m'),
  'poolcontrol:join_lookup',
)
export const joinRegisterRatelimit = limiterFor(
  Ratelimit.slidingWindow(5, '10 m'),
  'poolcontrol:join_register',
)

/**
 * Check a limiter, failing open. A rate limiter that is unreachable must never
 * take the feature down with it — an outage degrades to "unlimited", not "broken".
 */
export async function checkLimit(
  limiter: Ratelimit | null,
  key: string,
): Promise<{ success: boolean }> {
  if (!limiter) return { success: true }
  try {
    const { success } = await limiter.limit(key)
    return { success }
  } catch (err) {
    console.warn('[rate-limit] limiter unreachable — failing open:', err)
    return { success: true }
  }
}
