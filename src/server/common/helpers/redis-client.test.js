import { vi } from 'vitest'

import { Cluster, Redis } from 'ioredis'

import { config } from '#/config/config.js'
import { buildRedisClient } from './redis-client.js'

const mockLogger = {
  info: vi.fn(),
  error: vi.fn()
}

vi.mock('#/server/common/helpers/logging/logger.js', () => ({
  createLogger: () => mockLogger
}))

vi.mock('ioredis', () => ({
  ...vi.importActual('ioredis'),
  Cluster: vi.fn(function (nodes, options) {
    return {
      on: vi.fn((event, handler) => {
        if (event === 'connect') handler()
        if (event === 'error') handler(new Error('Redis connection error'))
      })
    }
  }),
  Redis: vi.fn(function () {
    return {
      on: vi.fn((event, handler) => {
        if (event === 'connect') handler()
        if (event === 'error') handler(new Error('Redis connection error'))
      })
    }
  })
}))

describe('#buildRedisClient', () => {
  beforeEach(() => {
    mockLogger.info.mockReset()
    mockLogger.error.mockReset()
  })

  describe('When Redis Single InstanceCache is requested', () => {
    beforeEach(() => {
      buildRedisClient(config.get('redis'))
    })

    test('Should instantiate a single Redis client', () => {
      expect(Redis).toHaveBeenCalledWith({
        db: 0,
        host: '127.0.0.1',
        keyPrefix: 'pesticides-ocr-frontend:',
        port: 6379
      })
    })

    test('Should log connection success', () => {
      expect(mockLogger.info).toHaveBeenCalledWith('Connected to Redis server')
    })

    test('Should log connection error', () => {
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Redis connection error')
      )
    })
  })

  describe('When a Redis Cluster is requested', () => {
    beforeEach(() => {
      buildRedisClient({
        ...config.get('redis'),
        useSingleInstanceCache: false,
        useTLS: true,
        username: 'user',
        password: 'pass'
      })
    })

    test('Should instantiate a Redis Cluster client', () => {
      expect(Cluster).toHaveBeenCalledWith(
        [{ host: '127.0.0.1', port: 6379 }],
        {
          dnsLookup: expect.any(Function),
          keyPrefix: 'pesticides-ocr-frontend:',
          redisOptions: { db: 0, password: 'pass', tls: {}, username: 'user' },
          slotsRefreshTimeout: 10000
        }
      )
    })

    test('Should call dnsLookup callback correctly', () => {
      const callArgs = Cluster.mock.calls[0]
      const dnsLookupFn = callArgs[1].dnsLookup
      const callback = vi.fn()
      dnsLookupFn('example.com', callback)
      expect(callback).toHaveBeenCalledWith(null, 'example.com')
    })

    test('Should log connection success', () => {
      expect(mockLogger.info).toHaveBeenCalledWith('Connected to Redis server')
    })

    test('Should log connection error', () => {
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Redis connection error')
      )
    })
  })
})
