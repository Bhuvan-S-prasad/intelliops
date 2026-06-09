import { Redis } from '@upstash/redis'

const redisUrl = process.env.UPSTASH_REDIS_REST_URL
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

let redisClient: Redis | null = null

if (redisUrl && redisToken) {
  redisClient = new Redis({
    url: redisUrl,
    token: redisToken,
  })
}

// In-memory fallback cache for development
interface CacheItem<T> {
  data: T
  expiresAt: number
}

const localCache = new Map<string, CacheItem<unknown>>()

export async function getWorkspaceFilesCache<T>(workspaceId: string): Promise<T | null> {
  const key = `cache:workspace:${workspaceId}:files`

  if (redisClient) {
    try {
      const cached = await redisClient.get(key)
      if (cached) {
        // Upstash client handles automatic deserialization or we parse it
        return (typeof cached === 'string' ? JSON.parse(cached) : cached) as T
      }
    } catch (err) {
      console.error('Redis cache get error:', err)
    }
  } else {
    const cached = localCache.get(key)
    if (cached) {
      if (Date.now() < cached.expiresAt) {
        return cached.data as T
      }
      localCache.delete(key)
    }
  }

  return null
}

export async function setWorkspaceFilesCache<T>(
  workspaceId: string,
  data: T,
  ttlSeconds = 60
): Promise<void> {
  const key = `cache:workspace:${workspaceId}:files`

  if (redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(data), { ex: ttlSeconds })
    } catch (err) {
      console.error('Redis cache set error:', err)
    }
  } else {
    localCache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })
  }
}

export async function invalidateWorkspaceFilesCache(workspaceId: string): Promise<void> {
  const key = `cache:workspace:${workspaceId}:files`

  if (redisClient) {
    try {
      await redisClient.del(key)
    } catch (err) {
      console.error('Redis cache delete error:', err)
    }
  } else {
    localCache.delete(key)
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  if (redisClient) {
    try {
      const cached = await redisClient.get(key)
      if (cached) {
        return (typeof cached === 'string' ? JSON.parse(cached) : cached) as T
      }
    } catch (err) {
      console.error('Redis cache get error:', err)
    }
  } else {
    const cached = localCache.get(key)
    if (cached) {
      if (Date.now() < cached.expiresAt) {
        return cached.data as T
      }
      localCache.delete(key)
    }
  }

  return null
}

export async function setCache<T>(key: string, data: T, ttlSeconds: number): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(data), { ex: ttlSeconds })
    } catch (err) {
      console.error('Redis cache set error:', err)
    }
  } else {
    localCache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })
  }
}

