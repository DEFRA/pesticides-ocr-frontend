import { createServer } from '#/server/server.js'

describe('#contentSecurityPolicy', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should set the CSP policy header', async () => {
    const resp = await server.inject({
      method: 'GET',
      url: '/'
    })

    expect(resp.headers['content-security-policy']).toBeDefined()
  })

  test('form-action allows the Entra login host so POST sign-out can redirect to it', async () => {
    const resp = await server.inject({
      method: 'GET',
      url: '/'
    })

    const csp = resp.headers['content-security-policy']
    expect(csp).toContain('form-action')
    expect(csp).toContain('https://login.microsoftonline.com')
  })
})
