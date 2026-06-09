import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

let uploadRateLimit: Ratelimit | null = null
let aiRateLimit: Ratelimit | null = null

if (redisUrl && redisToken) {
  const redis = new Redis({
    url: redisUrl,
    token: redisToken,
  })

  uploadRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 uploads per minute
    analytics: true,
    prefix: 'intelliops:upload_limit',
  })

  aiRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'), // 30 AI requests per minute
    analytics: true,
    prefix: 'intelliops:ai_limit',
  })
} else {
  console.warn('Upstash Redis environment variables are missing (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN). Rate limiting will be bypassed.')
}

export async function checkUploadLimit(userId: string): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
}> {
  if (!uploadRateLimit) {
    return {
      success: true,
      limit: 10,
      remaining: 10,
      reset: Date.now() + 60000,
    }
  }

  const result = await uploadRateLimit.limit(userId)
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}

export async function checkAiLimit(userId: string): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
}> {
  if (!aiRateLimit) {
    return {
      success: true,
      limit: 30,
      remaining: 30,
      reset: Date.now() + 60000,
    }
  }

  const result = await aiRateLimit.limit(userId)
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}
