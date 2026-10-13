import { vi } from 'vitest'
import { load } from 'cheerio'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { config } from '#/config/config.js'
import { signInCaseOfficer } from '#/test-helpers/session-helpers.js'

const BACKEND_URL = 'http://ocr-backend.test'

const figures = (
  starts,
  registrations,
  notEligible,
  dropOuts,
  completionRate
) => ({
  starts,
  registrations,
  notEligible,
  finished: registrations + notEligible,
  dropOuts,
  completionRate,
  registrationRate: completionRate
})

const METRICS = {
  ...figures(12, 2, 1, 9, 0.25),
  byYear: [{ year: '2026', ...figures(12, 2, 1, 9, 0.25) }],
  byMonth: [
    { month: '2026-09', ...figures(5, 2, 0, 3, 0.4) },
    { month: '2026-10', ...figures(7, 0, 1, 6, 0.1429) },
    { month: '2026-11', ...figures(0, 0, 0, 0, null) },
    { month: '2026-12', ...figures(100, 29, 0, 71, 0.29) }
  ]
}

describe('#serviceMetrics (EQ-472)', () => {
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

  const get = () =>
    server.inject({
      method: 'GET',
      url: '/dashboard/metrics',
      headers: { cookie }
    })

  const respondWith = (status, body) =>
    fetch.mockResolvedValue({
      ok: status === statusCodes.ok,
      status,
      json: async () => body
    })

  const tableRows = (result) =>
    load(result)('tbody tr')
      .toArray()
      .map((row) =>
        load(row)('th, td')
          .toArray()
          .map((cell) => load(cell).text().trim())
      )

  test('redirects an unauthenticated visitor to the Entra sign-in', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/dashboard/metrics'
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toContain('/auth/entra/sign-in')
    expect(fetch).not.toHaveBeenCalled()
  })

  test('asks the backend for the journey metrics with the case officer token', async () => {
    respondWith(statusCodes.ok, METRICS)

    await get()

    const [url, { headers }] = fetch.mock.calls[0]
    expect(url.toString()).toBe(`${BACKEND_URL}/metrics/journeys`)
    expect(headers.authorization).toMatch(/^Bearer \S+/)
  })

  test('shows the all-time figures, then each month', async () => {
    respondWith(statusCodes.ok, METRICS)

    const { statusCode, result } = await get()

    expect(statusCode).toBe(statusCodes.ok)
    expect(load(result)('h1').text()).toContain('Service metrics')
    expect(tableRows(result)).toEqual([
      ['All time', '12', '2', '1', '3', '9', '25%'],
      ['September 2026', '5', '2', '0', '2', '3', '40%'],
      ['October 2026', '7', '0', '1', '1', '6', '14%'],
      ['November 2026', '0', '0', '0', '0', '0', 'No starts'],
      ['December 2026', '100', '29', '0', '29', '71', '29%']
    ])
  })

  test('sends the case officer to sign in again when the backend rejects the token', async () => {
    respondWith(statusCodes.unauthorized)

    const { statusCode, headers } = await get()

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/auth/entra/sign-in?error=session-expired')
  })

  test('explains a missing permission', async () => {
    respondWith(statusCodes.forbidden)

    const { statusCode, result } = await get()

    expect(statusCode).toBe(statusCodes.ok)
    expect(load(result)('.govuk-error-summary').text()).toContain(
      'You do not have permission to view the service metrics'
    )
    expect(load(result)('table')).toHaveLength(0)
  })

  test('shows a service problem when the backend has no metrics endpoint', async () => {
    respondWith(statusCodes.notFound)

    const { statusCode, result } = await get()

    expect(statusCode).toBe(statusCodes.ok)
    expect(load(result)('.govuk-error-summary').text()).toContain(
      'Sorry, there is a problem with the service'
    )
  })

  test.each([
    ['no body', null],
    ['an empty month', { ...METRICS, byMonth: [null] }],
    ['a month without figures', { ...METRICS, byMonth: [{ month: '2026-09' }] }],
    ['a malformed month', { ...METRICS, byMonth: [{ ...METRICS.byMonth[0], month: 'Sept' }] }],
    ['missing all-time figures', { byMonth: [] }]
  ])('treats %s as a bad gateway', async (_case, body) => {
    respondWith(statusCodes.ok, body)

    const { statusCode, result } = await get()

    expect(statusCode).toBe(statusCodes.badGateway)
    expect(load(result)('.govuk-error-summary').text()).toContain(
      'Sorry, there is a problem with the service'
    )
  })

  test('keeps a backend failure as a server error', async () => {
    respondWith(statusCodes.internalServerError)

    const { statusCode, result } = await get()

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(load(result)('.govuk-error-summary').text()).toContain(
      'Sorry, there is a problem with the service'
    )
  })
})
