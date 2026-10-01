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

vi.mock('./search-client.js', () => ({
  fetchSearchResults: vi.fn(),
  fetchExport: vi.fn()
}))

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { signInCaseOfficer } from '#/test-helpers/session-helpers.js'
import { fetchSearchResults, fetchExport } from './search-client.js'

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
    vi.mocked(fetchExport).mockReset()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const get = (url) => server.inject({ method: 'GET', url, headers: { cookie } })
  const searchText = () => get('/search?search=Green')

  const searchResponse = (
    data,
    { page = 1, totalRecords = data.length } = {}
  ) => ({
    data,
    pagination: {
      page,
      pageSize: 10,
      totalRecords,
      totalPages: Math.ceil(totalRecords / 10)
    }
  })

  const greenOne = {
    reference: 'PPP-1A2-B3C',
    businessName: 'Green One',
    primaryContact: { contactName: 'Jo Bloggs' },
    address: { addressPostcode: 'NR1 1AA' },
    submittedAt: '2026-03-11T09:30:00.000Z'
  }
  const greenTwo = { reference: 'PPP-4D5-E6F', businessName: 'Green Two' }

  test('a single match shows as a summary card with an export link to it', async () => {
    vi.mocked(fetchSearchResults).mockResolvedValueOnce(searchResponse([greenOne]))

    const { statusCode, result } = await get('/search?search=PPP-1A2-B3C')
    const $ = load(result)
    const card = $('.govuk-summary-card')

    expect(statusCode).toBe(statusCodes.ok)
    expect($('h2').text()).toContain('1 result')
    expect($('.govuk-table')).toHaveLength(0)
    expect(card).toHaveLength(1)
    expect(card.find('.govuk-summary-card__title').text()).toContain(
      'Green One'
    )
    expect(card.find('.govuk-summary-list').text()).toContain('PPP-1A2-B3C')
    const exportLink = card.find('.govuk-summary-card__actions a')
    expect(exportLink.attr('href')).toBe(
      '/search/export?reference=PPP-1A2-B3C'
    )
    expect(exportLink.text()).toContain('Export')
    expect($('#search').val()).toBe('PPP-1A2-B3C')
  })

  test('several matches show as a table with a count, one row each', async () => {
    vi.mocked(fetchSearchResults).mockResolvedValueOnce(
      searchResponse([greenOne, greenTwo])
    )

    const { statusCode, result } = await searchText()
    const $ = load(result)
    const rows = $('.govuk-table__body .govuk-table__row')

    expect(statusCode).toBe(statusCodes.ok)
    expect($('h2').text()).toContain('2 results')
    expect($('.govuk-summary-card')).toHaveLength(0)
    expect(
      $('.govuk-table__head th')
        .map((_index, header) => $(header).text().trim())
        .get()
    ).toEqual(['Reference', 'Business name', 'Contact', 'Postcode', 'Registered'])
    expect(rows).toHaveLength(2)
    expect(
      rows
        .first()
        .find('td, th')
        .map((_index, cell) => $(cell).text().trim())
        .get()
    ).toEqual([
      'PPP-1A2-B3C',
      'Green One',
      'Jo Bloggs',
      'NR1 1AA',
      '11 March 2026'
    ])
  })

  test('references in the table are plain text, not links', async () => {
    vi.mocked(fetchSearchResults).mockResolvedValueOnce(
      searchResponse([greenOne, greenTwo])
    )

    const $ = load((await searchText()).result)

    expect($('.govuk-table a')).toHaveLength(0)
  })

  test('the table escapes stored values', async () => {
    vi.mocked(fetchSearchResults).mockResolvedValueOnce(
      searchResponse([
        { reference: '<b>PPP</b>', businessName: '<script>x</script>' },
        greenTwo
      ])
    )

    const { result } = await searchText()

    expect(result).not.toContain('<script>x</script>')
    expect(result).not.toContain('<b>PPP</b>')
  })

  test('results over several pages show the total and page links', async () => {
    vi.mocked(fetchSearchResults).mockResolvedValueOnce(
      searchResponse([greenOne, greenTwo], { page: 2, totalRecords: 12 })
    )

    const { result } = await get('/search?search=Green&page=2')
    const $ = load(result)

    expect(fetchSearchResults).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'Green', page: 2 })
    )
    expect($('h2').text()).toContain('12 results')
    expect($('.govuk-table')).toHaveLength(1)
    expect($('.govuk-pagination__prev a').attr('href')).toBe(
      '/search?search=Green&page=1'
    )
    expect($('.govuk-pagination__item--current').text()).toContain('2')
  })

  test('a single match on a later page still shows as the table', async () => {
    vi.mocked(fetchSearchResults).mockResolvedValueOnce(
      searchResponse([greenOne], { page: 2, totalRecords: 11 })
    )

    const $ = load((await get('/search?search=Green&page=2')).result)

    expect($('.govuk-table')).toHaveLength(1)
    expect($('.govuk-summary-card')).toHaveLength(0)
  })

  test('results on one page show no page links', async () => {
    vi.mocked(fetchSearchResults).mockResolvedValueOnce(
      searchResponse([greenOne, greenTwo])
    )

    const $ = load((await searchText()).result)

    expect($('.govuk-pagination')).toHaveLength(0)
  })

  test('a search with no matches shows "No results found"', async () => {
    vi.mocked(fetchSearchResults).mockResolvedValueOnce(searchResponse([]))

    const { statusCode, result } = await searchText()
    const $ = load(result)

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('No results found')
    expect($('.govuk-error-summary')).toHaveLength(0)
  })

  test('a backend 400 on a search shows a service problem', async () => {
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
    vi.mocked(fetchSearchResults).mockRejectedValueOnce(
      backendError(statusCodes.forbidden)
    )

    const { statusCode, result } = await searchText()
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
    expect($('.govuk-table')).toHaveLength(0)
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
