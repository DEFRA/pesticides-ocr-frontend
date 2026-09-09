import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

describe('#cookies route (EQ-363)', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('GET /cookies renders the preferences page', async () => {
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/cookies'
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(expect.stringContaining('Cookies'))
    expect(result).toContain('js-cookies-page-form')
    expect(result).toContain('cookies[analytics]')
  })

  test('POST /cookies (no-JS) stores the choice and redirects with success', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: '/cookies',
      payload: { cookies: { analytics: 'yes' } }
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/cookies?saved=true')

    const setCookie = [].concat(headers['set-cookie'] ?? []).join(';')
    expect(setCookie).toContain('ocr_cookies_analytics=')
    // value is URL-encoded JSON, e.g. %7B%22analytics%22%3Atrue...
    expect(decodeURIComponent(setCookie)).toContain('"analytics":true')
    expect(decodeURIComponent(setCookie)).toContain('"version":1')
  })

  test('POST /cookies with reject stores analytics=false', async () => {
    const { headers } = await server.inject({
      method: 'POST',
      url: '/cookies',
      payload: { cookies: { analytics: 'no' } }
    })
    const setCookie = [].concat(headers['set-cookie'] ?? []).join(';')
    expect(decodeURIComponent(setCookie)).toContain('"analytics":false')
  })

  test('POST /cookies rejects a cross-origin submission', async () => {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/cookies',
      headers: { origin: 'https://evil.example' },
      payload: { cookies: { analytics: 'yes' } }
    })
    expect(statusCode).toBe(statusCodes.forbidden)
  })

  test('POST /cookies allows a same-origin submission', async () => {
    const { statusCode } = await server.inject({
      method: 'POST',
      url: '/cookies',
      headers: { origin: 'http://localhost:3000', host: 'localhost:3000' },
      payload: { cookies: { analytics: 'yes' } }
    })
    expect(statusCode).toBe(statusCodes.redirect)
  })

  test('POST /cookies with an invalid payload redirects back (validation)', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'POST',
      url: '/cookies',
      payload: { cookies: { analytics: 'maybe' } }
    })
    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/cookies')
  })

  test('GET /cookies pre-selects "yes" from an existing consent cookie', async () => {
    const cookie = `ocr_cookies_analytics=${encodeURIComponent(
      JSON.stringify({ analytics: true, version: 1 })
    )}`
    const { result } = await server.inject({
      method: 'GET',
      url: '/cookies',
      headers: { cookie }
    })
    // The "yes" radio should be checked for a returning consenter.
    expect(result).toMatch(/value="yes"[^>]*checked/)
  })

  test('GET /cookies tolerates a malformed consent cookie (defaults to no)', async () => {
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/cookies',
      headers: { cookie: 'ocr_cookies_analytics=not-json' }
    })
    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toMatch(/value="no"[^>]*checked/)
  })
})
