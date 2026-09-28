import { vi } from 'vitest'
import { load } from 'cheerio'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { config } from '#/config/config.js'

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

describe('#search (EQ-227)', () => {
  let server
  let cookie

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    cookie = await signInCaseOfficer(server)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const get = (url) => server.inject({ method: 'GET', url, headers: { cookie } })

  test('redirects an unauthenticated visitor to the Entra sign-in', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/search'
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toContain('/auth/entra/sign-in')
  })

  test('shows a single reference search box and button with no results', async () => {
    const { statusCode, result } = await get('/search')
    const $ = load(result)

    expect(statusCode).toBe(statusCodes.ok)
    expect($('h1').text()).toContain('Search the register')
    expect($('form input.govuk-input')).toHaveLength(1)
    expect($('#reference-hint').text()).toContain(
      'Search for a reference, such as PPP-1A2-B3C'
    )
    expect($('form .govuk-button')).toHaveLength(1)
    expect($('.govuk-summary-card')).toHaveLength(0)
    expect($('.govuk-error-summary')).toHaveLength(0)
    expect(result).not.toContain('No results found')
  })

  test('an empty search shows an error summary linked to the field', async () => {
    const { statusCode, result } = await get('/search?reference=')
    const $ = load(result)

    expect(statusCode).toBe(statusCodes.ok)
    expect($('.govuk-error-summary a[href="#reference"]').text()).toContain(
      'Enter a reference'
    )
    expect($('#reference-error').text()).toContain('Enter a reference')
    expect($('title').text()).toContain('Error: Search the register')
  })

  test.each([
    ['the wrong prefix', 'ABC-1A2-B3C'],
    ['lower case', 'ppp-1a2-b3c'],
    ['too short a group', 'PPP-1A-B3C'],
    ['no separators', 'PPP1A2B3C'],
    ['an over-length value', 'a'.repeat(101)]
  ])(
    'a reference with %s shows a format error without calling the backend',
    async (_case, reference) => {
      const fetch = vi.fn()
      vi.stubGlobal('fetch', fetch)
      try {
        const { statusCode, result } = await get(
          `/search?reference=${encodeURIComponent(reference)}`
        )
        const $ = load(result)

        expect(statusCode).toBe(statusCodes.ok)
        expect(
          $('.govuk-error-summary a[href="#reference"]').text()
        ).toContain('Enter a reference in the correct format, like PPP-1A2-B3C')
        expect($('#reference-error').text()).toContain('correct format')
        expect($('#reference').val()).toBe(reference)
        expect(fetch).not.toHaveBeenCalled()
      } finally {
        vi.unstubAllGlobals()
      }
    }
  )

  test('repeated reference params show a format error', async () => {
    const { statusCode, result } = await get(
      '/search?reference=PPP-1A2-B3C&reference=PPP-4D5-E6F'
    )

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('correct format')
  })

  test('an invalid reference from an unauthenticated visitor is sent to sign in, not shown the page', async () => {
    // Query validation (and its failAction) runs before requireAuthorised, so
    // verify the failAction applies the auth guard itself and never renders the
    // page (or reflects the query) for a signed-out visitor.
    const { statusCode, headers, result } = await server.inject({
      method: 'GET',
      url: '/search?reference=not-a-reference'
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toContain('/auth/entra/sign-in')
    expect(result).not.toContain('not-a-reference')
  })

  test('the old /admin/operators page is gone', async () => {
    const { statusCode } = await get('/admin/operators')

    expect(statusCode).toBe(statusCodes.notFound)
  })

  // End-to-end proof (through the real Hapi pipeline and the real backend
  // client) that a live session with a missing/expired forwarded token bounces
  // the officer to re-authenticate rather than a dead-end error. The signed-in
  // session carries no access token, so the client raises a 401 before calling
  // the backend.
  test('live mode redirects to re-authenticate when the forwarded token is missing/expired', async () => {
    config.set('entra.mode', 'live')
    try {
      const { statusCode, headers } = await get('/search?reference=PPP-1A2-B3C')

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toContain('/auth/entra/sign-in')
    } finally {
      config.set('entra.mode', 'mock')
    }
  })

  // Mock sign-in has no access token, so the search forwards an unsigned one
  // built from the mock identity, which a local backend in mock auth mode
  // accepts — the search reaches the backend instead of bouncing to sign-in.
  test('mock mode forwards a mock-identity token to the backend', async () => {
    const originalUrl = config.get('ocrBackend.url')
    config.set('ocrBackend.url', 'http://ocr-backend.test')
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: statusCodes.ok,
      json: async () => ({ reference: 'PPP-1A2-B3C', businessName: 'Live Co' })
    })
    vi.stubGlobal('fetch', fetch)
    try {
      const { statusCode, result } = await get('/search?reference=PPP-1A2-B3C')

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toContain('Live Co')
      const [url, { headers }] = fetch.mock.calls[0]
      expect(url.toString()).toBe(
        'http://ocr-backend.test/search?reference=PPP-1A2-B3C'
      )
      const [, payload] = headers.authorization.replace('Bearer ', '').split('.')
      expect(
        JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).roles
      ).toEqual(config.get('entra.roleValues').split(','))
    } finally {
      vi.unstubAllGlobals()
      config.set('ocrBackend.url', originalUrl)
    }
  })
})
