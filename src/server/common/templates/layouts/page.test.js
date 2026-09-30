import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { signInCaseOfficer } from '#/test-helpers/session-helpers.js'

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

// Google Analytics (EQ-388) is production-only: the config element the client
// loader reads must NOT be rendered outside production, so non-prod tiers never
// load GTM. Tests run with NODE_ENV=test (isProduction false).
describe('#pageLayout Google Analytics gating', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('does not render the analytics config outside production', async () => {
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).not.toContain('js-analytics-config')
    expect(result).not.toContain('GTM-WS6QGKZN')
    // The cookie banner only appears where analytics can run.
    expect(result).not.toContain('govuk-cookie-banner')
  })
})
