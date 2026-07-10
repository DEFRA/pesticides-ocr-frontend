import { describe, test, expect, vi, beforeEach } from 'vitest'

describe('config password validation', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  test('Should throw error when password is less than 32 characters', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SESSION_COOKIE_PASSWORD', 'short')

    try {
      await import('./config.js')
      expect.fail('Should have thrown validation error')
    } catch (error) {
      expect(error.message).toContain(
        'SESSION_COOKIE_PASSWORD must be at least 32 characters long'
      )
    }
  })

  test('Should throw error when password is not a string', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SESSION_COOKIE_PASSWORD', '12345')

    try {
      await import('./config.js')
      expect.fail('Should have thrown validation error')
    } catch (error) {
      expect(error.message).toContain(
        'SESSION_COOKIE_PASSWORD must be at least 32 characters long'
      )
    }
  })

  test('Should accept password with exactly 32 characters', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('SESSION_COOKIE_PASSWORD', 'a'.repeat(32))

    const { config } = await import('./config.js')
    expect(config.get('session.cookie.password')).toBe('a'.repeat(32))
  })

  test('Should accept password longer than 32 characters', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const longPassword = 'a'.repeat(64)
    vi.stubEnv('SESSION_COOKIE_PASSWORD', longPassword)

    const { config } = await import('./config.js')
    expect(config.get('session.cookie.password')).toBe(longPassword)
  })
})
