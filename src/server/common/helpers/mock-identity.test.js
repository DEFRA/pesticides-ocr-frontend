import { vi } from 'vitest'

import { config } from '#/config/config.js'
import { applyMockIdentity, AUTH_SESSION_KEY } from './mock-identity.js'

// A minimal yar stub backed by a plain object, mirroring how @hapi/yar stores
// the auth session (getAuthSession reads request.yar.get(AUTH_SESSION_KEY)).
function fakeRequest(session) {
  const store = { [AUTH_SESSION_KEY]: session }
  return {
    yar: {
      get: (key) => store[key],
      set: vi.fn((key, value) => {
        store[key] = value
      })
    },
    store
  }
}

describe('#applyMockIdentity', () => {
  const displayName = 'Ulysses Alvarez'

  test('does nothing when the request has no yar session', () => {
    expect(() => applyMockIdentity({}, displayName)).not.toThrow()
    expect(() => applyMockIdentity(undefined, displayName)).not.toThrow()
  })

  test('does not touch an unauthenticated session', () => {
    const request = fakeRequest({ isAuthenticated: false })
    applyMockIdentity(request, displayName)
    expect(request.yar.set).not.toHaveBeenCalled()
  })

  test('rewrites the name (and first/last name) of a signed-in mock user', () => {
    const request = fakeRequest({ isAuthenticated: true, name: 'Sam Taylor' })
    applyMockIdentity(request, displayName)

    expect(request.yar.set).toHaveBeenCalledWith(
      AUTH_SESSION_KEY,
      expect.objectContaining({
        name: 'Ulysses Alvarez',
        firstName: 'Ulysses',
        lastName: 'Alvarez'
      })
    )
  })

  test('is idempotent — no write when the name already matches', () => {
    const request = fakeRequest({ isAuthenticated: true, name: displayName })
    applyMockIdentity(request, displayName)
    expect(request.yar.set).not.toHaveBeenCalled()
  })

  test('handles a single-word display name (empty last name)', () => {
    const request = fakeRequest({ isAuthenticated: true, name: 'Sam Taylor' })
    applyMockIdentity(request, 'Ulysses')

    expect(request.yar.set).toHaveBeenCalledWith(
      AUTH_SESSION_KEY,
      expect.objectContaining({
        name: 'Ulysses',
        firstName: 'Ulysses',
        lastName: ''
      })
    )
  })

  test('does nothing in live mode, even for a signed-in user (defence-in-depth)', () => {
    // Spy rather than mutate the shared config singleton, so live mode can't
    // leak into other test files. applyMockIdentity only reads 'entra.mode'.
    const spy = vi.spyOn(config, 'get').mockReturnValue('live')
    try {
      const request = fakeRequest({ isAuthenticated: true, name: 'Real User' })
      applyMockIdentity(request, displayName)
      expect(request.yar.set).not.toHaveBeenCalled()
    } finally {
      spy.mockRestore()
    }
  })
})
