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

  test('allows Google Tag Manager / Analytics in the correct directives (EQ-388)', async () => {
    const resp = await server.inject({ method: 'GET', url: '/' })
    const csp = resp.headers['content-security-policy']
    const directive = (name) =>
      csp
        .split(';')
        .map((d) => d.trim())
        .find((d) => d.startsWith(`${name} `)) ?? ''

    // script-src: gtm.js is loaded from googletagmanager by our own bundle (no
    // inline hash — the loader is served from 'self').
    expect(directive('script-src')).toContain('https://www.googletagmanager.com')
    // connect-src + img-src: every GA4/GTM beacon origin we added
    for (const name of ['connect-src', 'img-src']) {
      expect(directive(name)).toContain('https://*.google-analytics.com')
      expect(directive(name)).toContain('https://*.analytics.google.com')
      expect(directive(name)).toContain('https://*.googletagmanager.com')
    }
  })
})
