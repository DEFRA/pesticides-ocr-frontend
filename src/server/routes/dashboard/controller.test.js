import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

// Complete a mock case-officer sign-in and return the authenticated session cookie.
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

describe('#dashboardController (protected)', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('redirects an unauthenticated visitor to the Entra sign-in', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/dashboard'
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toContain('/auth/entra/sign-in')
  })

  test('renders the dashboard for a signed-in case officer (mock)', async () => {
    const cookie = await signInCaseOfficer(server)

    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/dashboard',
      headers: { cookie }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(expect.stringContaining('OCR Register dashboard'))
  })
})
