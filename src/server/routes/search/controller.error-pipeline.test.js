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
// view), of how backend API outcomes reach the case officer's browser: matches
// are summary cards, no match is "No results found", and any other API error is
// an error summary on the search page — an upstream failure keeping its 5xx
// status rather than being masked as a 200, and never an empty result presented
// as live truth. The backend client is mocked so we can force each outcome
// without a real backend; mock sign-in forwards its mock-identity token.
vi.mock('./search-client.js', () => ({
  fetchSearchResults: vi.fn(),
  fetchByReference: vi.fn(),
  fetchExport: vi.fn()
}))

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { signInCaseOfficer } from '#/test-helpers/session-helpers.js'
import {
  fetchSearchResults,
  fetchByReference,
  fetchExport
} from './search-client.js'

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
    vi.mocked(fetchSearchResults).mockReset()
    vi.mocked(fetchByReference).mockReset()
    vi.mocked(fetchExport).mockReset()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const get = (url) => server.inject({ method: 'GET', url, headers: { cookie } })
  const searchReference = () => get('/search?search=PPP-1A2-B3C')
  const searchText = () => get('/search?search=Green')

  test('a reference match shows as a summary card with an export link to it', async () => {
    vi.mocked(fetchByReference).mockResolvedValueOnce({
      reference: 'PPP-1A2-B3C',
      businessName: 'Live Co'
    })

    const { statusCode, result } = await searchReference()
    const $ = load(result)
    const card = $('.govuk-summary-card')

    expect(statusCode).toBe(statusCodes.ok)
    expect(card).toHaveLength(1)
    expect(card.find('.govuk-summary-card__title').text()).toContain('Live Co')
    expect(card.find('.govuk-summary-list').text()).toContain('PPP-1A2-B3C')
    const exportLink = card.find('.govuk-summary-card__actions a')
    expect(exportLink.attr('href')).toBe(
      '/search/export?reference=PPP-1A2-B3C'
    )
    expect(exportLink.text()).toContain('Export')
    expect($('#search').val()).toBe('PPP-1A2-B3C')
  })

  test('free-text matches show as one card each, with a count', async () => {
    vi.mocked(fetchSearchResults).mockResolvedValueOnce([
      { reference: 'PPP-1A2-B3C', businessName: 'Green One' },
      { reference: 'PPP-4D5-E6F', businessName: 'Green Two' }
    ])

    const { statusCode, result } = await searchText()
    const $ = load(result)

    expect(statusCode).toBe(statusCodes.ok)
    expect($('h2').text()).toContain('2 results')
    expect($('.govuk-summary-card')).toHaveLength(2)
    expect(
      $('.govuk-summary-card__actions a')
        .map((_i, a) => $(a).attr('href'))
        .get()
    ).toEqual([
      '/search/export?reference=PPP-1A2-B3C',
      '/search/export?reference=PPP-4D5-E6F'
    ])
  })

  test('a backend 404 on a reference shows "No results found"', async () => {
    vi.mocked(fetchByReference).mockResolvedValueOnce(null)

    const { statusCode, result } = await searchReference()
    const $ = load(result)

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('No results found')
    expect($('.govuk-error-summary')).toHaveLength(0)
  })

  test('a free-text search with no matches shows "No results found"', async () => {
    vi.mocked(fetchSearchResults).mockResolvedValueOnce([])

    const { result } = await searchText()

    expect(result).toContain('No results found')
  })

  test('a backend 400 on a reference shows a format error on the field', async () => {
    vi.mocked(fetchByReference).mockRejectedValueOnce(
      backendError(statusCodes.badRequest)
    )

    const { statusCode, result } = await searchReference()
    const $ = load(result)

    expect(statusCode).toBe(statusCodes.ok)
    expect($('.govuk-error-summary a[href="#search"]').text()).toContain(
      'Enter a reference in the correct format, like PPP-1A2-B3C'
    )
    expect($('#search-error').text()).toContain('correct format')
    expect(result).not.toContain('No results found')
  })

  test('a backend 400 on a free-text search shows a service problem', async () => {
    vi.mocked(fetchSearchResults).mockRejectedValueOnce(
      backendError(statusCodes.badRequest)
    )

    const { result } = await searchText()
    const $ = load(result)

    expect($('.govuk-error-summary').text()).toContain(
      'Sorry, there is a problem with the service. Try again later.'
    )
  })

  test('a backend 403 shows a permission error summary', async () => {
    vi.mocked(fetchByReference).mockRejectedValueOnce(
      backendError(statusCodes.forbidden)
    )

    const { statusCode, result } = await searchReference()
    const $ = load(result)

    expect(statusCode).toBe(statusCodes.ok)
    expect($('.govuk-error-summary').text()).toContain(
      'You do not have permission to search the register'
    )
  })

  test('a backend upstream failure shows an error summary with a 502 status', async () => {
    vi.mocked(fetchSearchResults).mockRejectedValueOnce(
      backendError(statusCodes.badGateway)
    )

    const { statusCode, result } = await searchText()
    const $ = load(result)

    expect(statusCode).toBe(statusCodes.badGateway)
    expect($('.govuk-error-summary').text()).toContain(
      'Sorry, there is a problem with the service. Try again later.'
    )
    // Never falls through to an empty result presented as live data.
    expect(result).not.toContain('No results found')
    expect($('.govuk-summary-card')).toHaveLength(0)
  })

  test('an export failure shows an error summary on the search page', async () => {
    vi.mocked(fetchExport).mockRejectedValueOnce(
      backendError(statusCodes.badGateway)
    )

    const { statusCode, result } = await get(
      '/search/export?reference=PPP-1A2-B3C'
    )
    const $ = load(result)

    expect(statusCode).toBe(statusCodes.badGateway)
    expect($('.govuk-error-summary').text()).toContain(
      'Sorry, there is a problem with the service. Try again later.'
    )
    expect($('#search').val()).toBe('PPP-1A2-B3C')
  })
})
