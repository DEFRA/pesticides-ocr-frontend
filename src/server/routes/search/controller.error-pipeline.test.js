import {
  describe,
  test,
  expect,
  vi,
  beforeAll,
  afterAll,
  afterEach
} from 'vitest'
import { load } from 'cheerio'

// End-to-end proof, through the whole Hapi pipeline (route -> controller ->
// view), of how backend API outcomes reach the case officer's browser: a match
// is a summary card, a 404 is "No results found", and any other API error is an
// error summary on the search page — an upstream failure keeping its 5xx status
// rather than being masked as a 200, and never an empty result presented as
// live truth. The backend client is mocked so we can force each outcome without
// a real backend.
vi.mock('./operators-client.js', () => ({
  fetchOperators: vi.fn(),
  fetchOperatorByReference: vi.fn()
}))

// A mock sign-in session carries no token, which the controller would bounce to
// re-authenticate before reaching the (mocked) client, so supply one.
vi.mock('@defra/hapi-oidc-auth', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    getAuthSession: vi.fn(() => ({ token: 'header.payload.signature' }))
  }
})

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { fetchOperatorByReference } from './operators-client.js'

// Complete a mock case-officer sign-in (mode defaults to mock in test) and return
// the authenticated session cookie.
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

const backendError = (statusCode) =>
  Object.assign(new Error(`OCR backend returned ${statusCode}`), { statusCode })

describe('#search backend-response pipeline (EQ-442)', () => {
  let server
  let cookie

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    cookie = await signInCaseOfficer(server)
  })

  afterEach(() => {
    vi.mocked(fetchOperatorByReference).mockReset()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const search = () =>
    server.inject({
      method: 'GET',
      url: '/search?reference=PPP-1A2-B3C',
      headers: { cookie }
    })

  test('a match shows as a summary card with an export action', async () => {
    vi.mocked(fetchOperatorByReference).mockResolvedValueOnce({
      reference: 'PPP-1A2-B3C',
      businessName: 'Live Co'
    })

    const { statusCode, result } = await search()
    const $ = load(result)
    const card = $('.govuk-summary-card')

    expect(statusCode).toBe(statusCodes.ok)
    expect(card).toHaveLength(1)
    expect(card.find('.govuk-summary-card__title').text()).toContain('Live Co')
    expect(card.find('.govuk-summary-list').text()).toContain('PPP-1A2-B3C')
    const exportLink = card.find('.govuk-summary-card__actions a')
    expect(exportLink.attr('href')).toBe('#')
    expect(exportLink.text()).toContain('Export')
    expect($('#reference').val()).toBe('PPP-1A2-B3C')
  })

  test('a backend 404 shows "No results found" under the search field', async () => {
    vi.mocked(fetchOperatorByReference).mockResolvedValueOnce(null)

    const { statusCode, result } = await search()
    const $ = load(result)

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('No results found')
    expect($('.govuk-error-summary')).toHaveLength(0)
  })

  test('a backend 400 (malformed reference) shows a format error on the field', async () => {
    vi.mocked(fetchOperatorByReference).mockRejectedValueOnce(
      backendError(statusCodes.badRequest)
    )

    const { statusCode, result } = await search()
    const $ = load(result)

    expect(statusCode).toBe(statusCodes.ok)
    expect($('.govuk-error-summary a[href="#reference"]').text()).toContain(
      'Enter a reference in the correct format, like PPP-1A2-B3C'
    )
    expect($('#reference-error').text()).toContain('correct format')
    expect(result).not.toContain('No results found')
  })

  test('a backend 403 shows a permission error summary', async () => {
    vi.mocked(fetchOperatorByReference).mockRejectedValueOnce(
      backendError(statusCodes.forbidden)
    )

    const { statusCode, result } = await search()
    const $ = load(result)

    expect(statusCode).toBe(statusCodes.ok)
    expect($('.govuk-error-summary').text()).toContain(
      'You do not have permission to search the register'
    )
  })

  test('a backend upstream failure shows an error summary with a 502 status', async () => {
    vi.mocked(fetchOperatorByReference).mockRejectedValueOnce(
      backendError(statusCodes.badGateway)
    )

    const { statusCode, result } = await search()
    const $ = load(result)

    expect(statusCode).toBe(statusCodes.badGateway)
    expect($('.govuk-error-summary').text()).toContain(
      'Sorry, there is a problem with the service. Try again later.'
    )
    // Never falls through to an empty result presented as live data.
    expect(result).not.toContain('No results found')
    expect($('.govuk-summary-card')).toHaveLength(0)
  })
})
