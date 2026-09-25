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

  // Post the preferences form exactly as a browser does without JS: form-encoded,
  // with the radio as the flat field name cookies[analytics].
  function postForm(analytics, headers = {}) {
    return server.inject({
      method: 'POST',
      url: '/cookies',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
        ...headers
      },
      payload: new URLSearchParams({ 'cookies[analytics]': analytics }).toString()
    })
  }

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
    const { statusCode, headers } = await postForm('yes')

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/cookies?saved=true')

    const setCookie = [].concat(headers['set-cookie'] ?? []).join(';')
    // Plain JSON, readable as-is in dev tools, matching what the client writes.
    expect(setCookie).toContain(
      'ocr_cookies_analytics={"analytics":true,"version":1}'
    )
  })

  test('POST /cookies with reject stores analytics=false', async () => {
    const { headers } = await postForm('no')
    const setCookie = [].concat(headers['set-cookie'] ?? []).join(';')
    expect(setCookie).toContain(
      'ocr_cookies_analytics={"analytics":false,"version":1}'
    )
  })

  test('POST /cookies rejects a cross-origin submission', async () => {
    const { statusCode } = await postForm('yes', {
      origin: 'https://evil.example'
    })
    expect(statusCode).toBe(statusCodes.forbidden)
  })

  // Sandboxed frames and some redirects send the literal Origin: null.
  test('POST /cookies rejects an unparseable origin with 403, not 500', async () => {
    const { statusCode } = await postForm('yes', { origin: 'null' })
    expect(statusCode).toBe(statusCodes.forbidden)
  })

  test('POST /cookies allows a same-origin submission', async () => {
    const { statusCode } = await postForm('yes', {
      origin: 'http://localhost:3000',
      host: 'localhost:3000'
    })
    expect(statusCode).toBe(statusCodes.redirect)
  })

  test('POST /cookies with an invalid payload redirects back (validation)', async () => {
    const { statusCode, headers } = await postForm('maybe')
    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/cookies')
    expect(headers['set-cookie']).toBeUndefined()
  })

  // Plain JSON is the written form; URL-encoded values are still accepted.
  test.each([
    ['plain JSON', JSON.stringify({ analytics: true, version: 1 })],
    [
      'an older URL-encoded value',
      encodeURIComponent(JSON.stringify({ analytics: true, version: 1 }))
    ]
  ])(
    'GET /cookies pre-selects "yes" from a consent cookie holding %s',
    async (_description, value) => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/cookies',
        headers: { cookie: `ocr_cookies_analytics=${value}` }
      })
      // The "yes" radio should be checked for a returning consenter.
      expect(result).toMatch(/value="yes"[^>]*checked/)
    }
  )

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
