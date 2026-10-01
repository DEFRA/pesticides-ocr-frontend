import { vi } from 'vitest'
import { load } from 'cheerio'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { config } from '#/config/config.js'
import { signInCaseOfficer } from '#/test-helpers/session-helpers.js'

const BACKEND_URL = 'http://ocr-backend.test'

const decodeTokenPayload = (authorization) => {
  const [, payload] = authorization.replace('Bearer ', '').split('.')
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
}

// Through the real Hapi pipeline and the real backend client, with fetch
// stubbed wherever a request would reach the backend.
describe('#search (EQ-227, EQ-402)', () => {
  let server
  let cookie
  let fetch
  const originalUrl = config.get('ocrBackend.url')

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    cookie = await signInCaseOfficer(server)
  })

  beforeEach(() => {
    fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    config.set('ocrBackend.url', BACKEND_URL)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    config.set('ocrBackend.url', originalUrl)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const get = (url) => server.inject({ method: 'GET', url, headers: { cookie } })

  const jsonResponse = (body) => ({
    ok: true,
    status: statusCodes.ok,
    json: async () => body
  })

  const requestedUrl = () => fetch.mock.calls[0][0].toString()

  const searchBody = (data = []) => ({
    data,
    pagination: {
      page: 1,
      pageSize: 10,
      totalRecords: data.length,
      totalPages: data.length ? 1 : 0
    }
  })

  test('redirects an unauthenticated visitor to the Entra sign-in', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/search'
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toContain('/auth/entra/sign-in')
  })

  test('shows a single search box and button, without calling the backend', async () => {
    const { statusCode, result } = await get('/search')
    const $ = load(result)

    expect(statusCode).toBe(statusCodes.ok)
    expect($('h1').text()).toContain('Search the register')
    expect($('form input.govuk-input')).toHaveLength(1)
    expect($('#search-hint').text()).toContain(
      'Search for a reference, such as PPP-1A2-B3C, or a business name, contact name, email, town or postcode. Use * to match any characters.'
    )
    expect($('form .govuk-button')).toHaveLength(1)
    expect($('.govuk-summary-card')).toHaveLength(0)
    expect(result).not.toContain('No results found')
    expect(fetch).not.toHaveBeenCalled()
  })

  test('searches the backend for the term, from the first page', async () => {
    fetch.mockResolvedValue(jsonResponse(searchBody()))

    await get('/search?search=Green%20Acres')

    expect(requestedUrl()).toBe(`${BACKEND_URL}/search?q=Green%20Acres&page=1`)
  })

  test('a term in the reference format is searched like any other', async () => {
    fetch.mockResolvedValue(
      jsonResponse(
        searchBody([{ reference: 'PPP-1A2-B3C', businessName: 'Live Co' }])
      )
    )

    const { statusCode, result } = await get('/search?search=ppp-1a2-b3c')

    expect(statusCode).toBe(statusCodes.ok)
    expect(requestedUrl()).toBe(`${BACKEND_URL}/search?q=ppp-1a2-b3c&page=1`)
    expect(load(result)('.govuk-summary-card')).toHaveLength(1)
  })

  test('asks the backend for the requested page', async () => {
    fetch.mockResolvedValue(jsonResponse(searchBody()))

    await get('/search?search=Green&page=3')

    expect(requestedUrl()).toBe(`${BACKEND_URL}/search?q=Green&page=3`)
  })

  test.each(['0', '-1', 'abc', '1.5', '10001'])(
    'treats page=%s as the first page',
    async (page) => {
      fetch.mockResolvedValue(jsonResponse(searchBody()))

      const { statusCode } = await get(`/search?search=Green&page=${page}`)

      expect(statusCode).toBe(statusCodes.ok)
      expect(requestedUrl()).toBe(`${BACKEND_URL}/search?q=Green&page=1`)
    }
  )

  test.each([
    [
      'a blank search',
      '',
      'Enter a reference, business name, contact name, email, town or postcode'
    ],
    [
      'a whitespace search',
      '%20%20',
      'Enter a reference, business name, contact name, email, town or postcode'
    ],
    ['a wildcard-only search', '**', 'Search must include more than just *'],
    [
      'a search with too many wildcards',
      'a*b*c*d*e*f*g',
      'Search must use * no more than 5 times'
    ]
  ])(
    '%s shows an error on the field without calling the backend',
    async (_case, search, message) => {
      const { statusCode, result } = await get(`/search?search=${search}`)
      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect($('.govuk-error-summary a[href="#search"]').text()).toContain(
        message
      )
      expect($('#search-error').text()).toContain(message)
      expect(fetch).not.toHaveBeenCalled()
    }
  )

  test('the example reference in the hint comes from config', async () => {
    config.set('referencePrefix', 'OCR')
    try {
      const { result } = await get('/search')

      expect(load(result)('#search-hint').text()).toContain('OCR-1A2-B3C')
    } finally {
      config.set('referencePrefix', 'PPP')
    }
  })

  test('a search longer than 100 characters shows an error without calling the backend', async () => {
    const search = 'a'.repeat(101)
    const { statusCode, result } = await get(`/search?search=${search}`)
    const $ = load(result)

    expect(statusCode).toBe(statusCodes.ok)
    expect($('.govuk-error-summary a[href="#search"]').text()).toContain(
      'Search must be 100 characters or fewer'
    )
    expect($('#search-error').text()).toContain('100 characters or fewer')
    expect($('#search').val()).toBe(search)
    expect($('title').text()).toContain('Error: Search the register')
    expect(fetch).not.toHaveBeenCalled()
  })

  test('repeated search params show an error without calling the backend', async () => {
    const { statusCode, result } = await get('/search?search=a&search=b')

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Enter one search term')
    expect(fetch).not.toHaveBeenCalled()
  })

  test('an invalid search from an unauthenticated visitor is sent to sign in, not shown the page', async () => {
    // Query validation (and its failAction) runs before requireAuthorised, so
    // verify the failAction applies the auth guard itself and never renders the
    // page (or reflects the query) for a signed-out visitor.
    const search = 'x'.repeat(101)
    const { statusCode, headers, result } = await server.inject({
      method: 'GET',
      url: `/search?search=${search}`
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toContain('/auth/entra/sign-in')
    expect(result).not.toContain(search)
  })

  test.each([
    ['the search page', '/search', true],
    ['a validation error', `/search?search=${'a'.repeat(101)}`, true],
    ['the auth guard redirect', '/search', false],
    ['the export', '/search/export?reference=PPP-1A2-B3C', true]
  ])(
    'marks %s no-store so the browser never keeps a copy',
    async (_case, url, signedIn) => {
      fetch.mockResolvedValue({
        ok: true,
        status: statusCodes.ok,
        arrayBuffer: async () => new ArrayBuffer(0)
      })

      const { headers } = signedIn
        ? await get(url)
        : await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    }
  )

  test('/admin/operators returns 404', async () => {
    const { statusCode } = await get('/admin/operators')

    expect(statusCode).toBe(statusCodes.notFound)
  })

  // Mock sign-in has no access token, so the search forwards an unsigned one
  // built from the mock identity, which a local backend in mock auth mode
  // accepts — the search reaches the backend instead of bouncing to sign-in.
  test('mock mode forwards a mock-identity token to the backend', async () => {
    fetch.mockResolvedValue(
      jsonResponse(
        searchBody([{ reference: 'PPP-1A2-B3C', businessName: 'Live Co' }])
      )
    )

    const { statusCode, result } = await get('/search?search=PPP-1A2-B3C')

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('Live Co')
    const [, { headers }] = fetch.mock.calls[0]
    const payload = decodeTokenPayload(headers.authorization)
    expect(payload.roles).toEqual(
      config
        .get('entra.roleValues')
        .split(',')
        .map((role) => role.trim())
    )
    expect(payload.scp).toBe('access_as_user')
  })

  // A live session with a missing/expired forwarded token bounces the officer
  // to re-authenticate rather than a dead-end error. The signed-in session
  // carries no access token, so the client raises a 401 before calling the
  // backend.
  test('live mode redirects to re-authenticate when the forwarded token is missing/expired', async () => {
    config.set('entra.mode', 'live')
    try {
      const { statusCode, headers } = await get('/search?search=PPP-1A2-B3C')

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toContain('/auth/entra/sign-in')
      expect(fetch).not.toHaveBeenCalled()
    } finally {
      config.set('entra.mode', 'mock')
    }
  })

  describe('export', () => {
    test('passes the backend CSV through as a download, BOM intact', async () => {
      const csv = '﻿"Reference"\r\n"PPP-1A2-B3C"'
      fetch.mockResolvedValue({
        ok: true,
        status: statusCodes.ok,
        arrayBuffer: async () => new TextEncoder().encode(csv).buffer
      })

      const res = await get('/search/export?reference=ppp-1a2-b3c')

      expect(res.statusCode).toBe(statusCodes.ok)
      expect(requestedUrl()).toBe(`${BACKEND_URL}/export?reference=PPP-1A2-B3C`)
      expect(res.headers['content-type']).toBe('text/csv; charset=utf-8')
      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="ocr-registration-PPP-1A2-B3C.csv"'
      )
      expect(res.rawPayload.equals(Buffer.from(csv, 'utf8'))).toBe(true)
    })

    test('a value that is not a reference shows the format error without calling the backend', async () => {
      const { statusCode, result } = await get(
        '/search/export?reference=Green%20Acres'
      )
      const $ = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect($('.govuk-error-summary a[href="#search"]').text()).toContain(
        'Enter a reference in the correct format, like PPP-1A2-B3C'
      )
      expect(fetch).not.toHaveBeenCalled()
    })

    test('without a reference it goes back to the search page', async () => {
      const { statusCode, headers } = await get('/search/export')

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/search')
    })

    test('requires sign-in', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/search/export?reference=PPP-1A2-B3C'
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toContain('/auth/entra/sign-in')
      expect(fetch).not.toHaveBeenCalled()
    })

    test('requires sign-in even without a reference', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/search/export'
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toContain('/auth/entra/sign-in')
    })
  })
})
