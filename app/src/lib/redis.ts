import Redis from 'ioredis'

let redis: Redis | null = null
let redisSubscriber: Redis | null = null
let redisPublisher: Redis | null = null

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

/**
 * Get the main Redis instance
 */
export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
  }
  return redis
}

/**
 * Get a Redis subscriber instance (dedicated for pub/sub)
 */
export function getRedisSubscriber(): Redis {
  if (!redisSubscriber) {
    redisSubscriber = new Redis(REDIS_URL, {
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
  }
  return redisSubscriber
}

/**
 * Get a Redis publisher instance (dedicated for pub/sub)
 */
export function getRedisPublisher(): Redis {
  if (!redisPublisher) {
    redisPublisher = new Redis(REDIS_URL, {
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
  }
  return redisPublisher
}

/**
 * Cache utilities
 */
export const cache = {
  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await getRedis().get(key)
      return value ? JSON.parse(value) : null
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  },

  /**
   * Set a value in cache with optional TTL (in seconds)
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value)
      if (ttlSeconds) {
        await getRedis().setex(key, ttlSeconds, serialized)
      } else {
        await getRedis().set(key, serialized)
      }
    } catch (error) {
      console.error('Cache set error:', error)
    }
  },

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    try {
      await getRedis().del(key)
    } catch (error) {
      console.error('Cache del error:', error)
    }
  },

  /**
   * Delete multiple keys with a pattern
   */
  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await getRedis().keys(pattern)
      if (keys.length > 0) {
        await getRedis().del(...keys)
      }
    } catch (error) {
      console.error('Cache delPattern error:', error)
    }
  },
}

/**
 * Pub/Sub utilities for real-time updates
 */
export const pubsub = {
  /**
   * Publish an event to a channel
   */
  async publish(channel: string, data: any): Promise<void> {
    try {
      await getRedisPublisher().publish(channel, JSON.stringify(data))
    } catch (error) {
      console.error('PubSub publish error:', error)
    }
  },

  /**
   * Subscribe to a channel
   */
  async subscribe(channel: string, callback: (data: any) => void): Promise<void> {
    try {
      const subscriber = getRedisSubscriber()
      await subscriber.subscribe(channel)
      
      subscriber.on('message', (receivedChannel, message) => {
        if (receivedChannel === channel) {
          try {
            const data = JSON.parse(message)
            callback(data)
          } catch (error) {
            console.error('PubSub message parse error:', error)
          }
        }
      })
    } catch (error) {
      console.error('PubSub subscribe error:', error)
    }
  },

  /**
   * Unsubscribe from a channel
   */
  async unsubscribe(channel: string): Promise<void> {
    try {
      await getRedisSubscriber().unsubscribe(channel)
    } catch (error) {
      console.error('PubSub unsubscribe error:', error)
    }
  },
}

/**
 * Cleanup connections on process exit
 */
process.on('exit', () => {
  if (redis) redis.disconnect()
  if (redisSubscriber) redisSubscriber.disconnect()
  if (redisPublisher) redisPublisher.disconnect()
})