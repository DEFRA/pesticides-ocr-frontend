import {
  describe,
  test,
  expect,
  vi,
  beforeAll,
  afterAll
} from 'vitest'

// End-to-end proof — through the whole Hapi pipeline (route -> controller ->
// onPreResponse/catchAll -> errors.js status recovery) — that a backend upstream
// failure surfaces to the case officer's browser as a real HTTP 502, not a masked
// 500 nor an empty "no operators" grid presented as live truth. The backend
// client is mocked so we can force the failure without a real backend or a
// forwarded token; unit coverage of the throw itself is in controller.unit.test.js
// and the direct catchAll recovery is in errors.test.js.
vi.mock('./operators-client.js', () => ({
  fetchOperators: vi.fn(),
  fetchOperatorByReference: vi.fn()
}))

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { config } from '#/config/config.js'
import { fetchOperators } from './operators-client.js'

// Complete a mock case-officer sign-in (mode defaults to mock in test) and return
// the authenticated session cookie.
async function signInCaseOfficer(server) {
  const start = await server.inject({ method: 'GET', url: '/auth/entra/start' })
  const startCookie = start.headers['set-cookie'][0].split(';')[0]
  const callback = await server.inject({
    method: 'GET',
    url: start.headers.location,
    headers: { cookie: startCookie }
  })
  const setCookie = callback.headers['set-cookie']
  return (setCookie ? setCookie[0] : startCookie).split(';')[0]
}

describe('#adminOperators backend-error pipeline (EQ-442)', () => {
  let server
  let cookie

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    cookie = await signInCaseOfficer(server)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    config.set('entra.mode', 'mock')
  })

  test('a backend upstream failure surfaces to the browser as a 502', async () => {
    config.set('entra.mode', 'live')
    const upstream = Object.assign(new Error('OCR backend request failed'), {
      statusCode: statusCodes.badGateway
    })
    vi.mocked(fetchOperators).mockRejectedValueOnce(upstream)

    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/admin/operators',
      headers: { cookie }
    })

    expect(statusCode).toBe(statusCodes.badGateway)
    // Never falls through to the mock grid presented as live data.
    expect(result).not.toEqual(expect.stringContaining('Pesticides Ltd'))
  })
})
