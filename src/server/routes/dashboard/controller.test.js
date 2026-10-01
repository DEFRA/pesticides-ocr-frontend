import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { signInCaseOfficer } from '#/test-helpers/session-helpers.js'

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
