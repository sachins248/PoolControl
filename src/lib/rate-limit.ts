import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

// Coach PC streaming — called once per criterion during an audit
export const coachRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(120, '10 m'),
  prefix: 'poolcontrol:coach',
})

// Coaching points — called once per completed audit
export const coachingPointsRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(30, '10 m'),
  prefix: 'poolcontrol:coaching_points',
})

// Training plan generation — expensive, used rarely
export const trainingRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 h'),
  prefix: 'poolcontrol:training',
})
