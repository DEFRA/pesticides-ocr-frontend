import { config } from '#/config/config.js'
import { buildMockAccessToken } from './mock-access-token.js'

const decodePart = (part) =>
  JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))

const session = {
  isAuthenticated: true,
  subject: 'urn:entra:staff-demo',
  name: 'Case Officer',
  roles: ['case_officer']
}

describe('#buildMockAccessToken', () => {
  const originalMode = config.get('entra.mode')

  afterEach(() => {
    config.set('entra.mode', originalMode)
  })

  test('builds an unsigned JWT carrying the mock identity in mock mode', () => {
    config.set('entra.mode', 'mock')

    const [header, payload, signature] =
      buildMockAccessToken(session).split('.')

    expect(decodePart(header)).toEqual({ alg: 'none', typ: 'JWT' })
    expect(decodePart(payload)).toEqual({
      sub: 'urn:entra:staff-demo',
      name: 'Case Officer',
      roles: ['case_officer']
    })
    expect(signature).toBe('')
  })

  test('returns nothing in live mode', () => {
    config.set('entra.mode', 'live')

    expect(buildMockAccessToken(session)).toBe('')
  })

  test('returns nothing for a session that is not signed in', () => {
    config.set('entra.mode', 'mock')

    expect(buildMockAccessToken({ isAuthenticated: false })).toBe('')
    expect(buildMockAccessToken(undefined)).toBe('')
  })
})
