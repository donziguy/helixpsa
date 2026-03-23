import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cache, pubsub } from './redis'

// Mock Redis
const mockRedis = {
  get: vi.fn(),
  set: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  publish: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  on: vi.fn(),
  disconnect: vi.fn(),
}

vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => mockRedis),
  }
})

describe('Redis Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('cache.get', () => {
    it('should return parsed data when key exists', async () => {
      const mockData = { id: '1', name: 'test' }
      const { getRedis } = await import('./redis')
      const redis = getRedis()
      vi.mocked(redis.get).mockResolvedValue(JSON.stringify(mockData))

      const result = await cache.get('test-key')
      
      expect(redis.get).toHaveBeenCalledWith('test-key')
      expect(result).toEqual(mockData)
    })

    it('should return null when key does not exist', async () => {
      const { getRedis } = await import('./redis')
      const redis = getRedis()
      vi.mocked(redis.get).mockResolvedValue(null)

      const result = await cache.get('nonexistent-key')
      
      expect(result).toBeNull()
    })

    it('should return null on error', async () => {
      const { getRedis } = await import('./redis')
      const redis = getRedis()
      vi.mocked(redis.get).mockRejectedValue(new Error('Redis error'))

      const result = await cache.get('error-key')
      
      expect(result).toBeNull()
    })
  })

  describe('cache.set', () => {
    it('should set data without TTL', async () => {
      const { getRedis } = await import('./redis')
      const redis = getRedis()
      const testData = { id: '1', name: 'test' }

      await cache.set('test-key', testData)
      
      expect(redis.set).toHaveBeenCalledWith('test-key', JSON.stringify(testData))
    })

    it('should set data with TTL', async () => {
      const { getRedis } = await import('./redis')
      const redis = getRedis()
      const testData = { id: '1', name: 'test' }

      await cache.set('test-key', testData, 300)
      
      expect(redis.setex).toHaveBeenCalledWith('test-key', 300, JSON.stringify(testData))
    })
  })

  describe('cache.del', () => {
    it('should delete a key', async () => {
      const { getRedis } = await import('./redis')
      const redis = getRedis()

      await cache.del('test-key')
      
      expect(redis.del).toHaveBeenCalledWith('test-key')
    })
  })

  describe('cache.delPattern', () => {
    it('should delete keys matching pattern', async () => {
      const { getRedis } = await import('./redis')
      const redis = getRedis()
      vi.mocked(redis.keys).mockResolvedValue(['key1', 'key2', 'key3'])

      await cache.delPattern('test:*')
      
      expect(redis.keys).toHaveBeenCalledWith('test:*')
      expect(redis.del).toHaveBeenCalledWith('key1', 'key2', 'key3')
    })

    it('should not call del when no keys match', async () => {
      const { getRedis } = await import('./redis')
      const redis = getRedis()
      vi.mocked(redis.keys).mockResolvedValue([])

      await cache.delPattern('test:*')
      
      expect(redis.keys).toHaveBeenCalledWith('test:*')
      expect(redis.del).not.toHaveBeenCalled()
    })
  })
})

describe('Redis PubSub', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('pubsub.publish', () => {
    it('should publish data to channel', async () => {
      const { getRedisPublisher } = await import('./redis')
      const publisher = getRedisPublisher()
      const testData = { type: 'test', payload: 'data' }

      await pubsub.publish('test-channel', testData)
      
      expect(publisher.publish).toHaveBeenCalledWith('test-channel', JSON.stringify(testData))
    })
  })

  describe('pubsub.subscribe', () => {
    it('should subscribe to channel and call callback', async () => {
      const { getRedisSubscriber } = await import('./redis')
      const subscriber = getRedisSubscriber()
      const callback = vi.fn()
      const testData = { type: 'test', payload: 'data' }

      // Mock the message event handler
      let messageHandler: (channel: string, message: string) => void
      vi.mocked(subscriber.on).mockImplementation((event, handler) => {
        if (event === 'message') {
          messageHandler = handler as any
        }
      })

      await pubsub.subscribe('test-channel', callback)
      
      expect(subscriber.subscribe).toHaveBeenCalledWith('test-channel')
      expect(subscriber.on).toHaveBeenCalledWith('message', expect.any(Function))

      // Simulate receiving a message
      messageHandler!('test-channel', JSON.stringify(testData))
      expect(callback).toHaveBeenCalledWith(testData)
    })
  })

  describe('pubsub.unsubscribe', () => {
    it('should unsubscribe from channel', async () => {
      const { getRedisSubscriber } = await import('./redis')
      const subscriber = getRedisSubscriber()

      await pubsub.unsubscribe('test-channel')
      
      expect(subscriber.unsubscribe).toHaveBeenCalledWith('test-channel')
    })
  })
})