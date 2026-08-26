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

// The header sign-out is security-relevant: @defra/hapi-oidc-auth 0.3.0 makes
// /auth/sign-out POST-only (logout-CSRF fix), so the header control must submit
// a POST form, not a GET link (a regression back to <a href> would 404).
describe('#pageLayout header sign-out', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('renders the sign-out control as a POST form, not a GET link', async () => {
    const cookie = await signInCaseOfficer(server)

    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/dashboard',
      headers: { cookie }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('<form class="app-account-nav__signout-form" method="post" action="/auth/sign-out">')
    )
    expect(result).toEqual(
      expect.stringContaining('data-testid="header-sign-out"')
    )
    // Must not have regressed to a GET anchor pointing at the POST-only route.
    expect(result).not.toEqual(
      expect.stringContaining('href="/auth/sign-out"')
    )
  })

  test('rejects a GET to /auth/sign-out (POST-only route, GET vector closed)', async () => {
    const cookie = await signInCaseOfficer(server)

    const { statusCode } = await server.inject({
      method: 'GET',
      url: '/auth/sign-out',
      headers: { cookie }
    })

    expect(statusCode).toBe(statusCodes.notFound)
  })
})
