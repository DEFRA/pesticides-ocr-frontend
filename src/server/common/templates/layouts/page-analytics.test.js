import { vi } from 'vitest'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import { signInCaseOfficer } from '#/test-helpers/session-helpers.js'

vi.mock(import('#/config/config.js'), async (importOriginal) => {
  const originalModule = await importOriginal()
  return {
    config: {
      ...originalModule.config,
      get(key) {
        if (key === 'analytics.enabled') return true
        return originalModule.config.get(key)
      }
    }
  }
})

describe('#pageLayout analytics', () => {
  let server
  let cookie

  beforeAll(async () => {
    const { createServer } = await import('#/server/server.js')
    server = await createServer()
    await server.initialize()
    cookie = await signInCaseOfficer(server)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const get = (url, headers = {}) => server.inject({ method: 'GET', url, headers })

  test('renders the GTM config and cookie banner on a public page', async () => {
    const { statusCode, result } = await get('/')

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toContain('js-analytics-config')
    expect(result).toContain('govuk-cookie-banner')
  })

  test.each([
    ['/dashboard', 'OCR Register dashboard'],
    ['/dashboard/metrics', 'Service metrics'],
    ['/search', 'Search the register'],
    ['/search?search=Smith', 'Search the register']
  ])(
    'renders neither on the case-officer page %s',
    async (url, heading) => {
      const { result } = await get(url, { cookie })

      expect(result).toContain(heading)
      expect(result).not.toContain('js-analytics-config')
      expect(result).not.toContain('govuk-cookie-banner')
    }
  )

  test.each(['/dashboard', '/search', '/search?search=Smith'])(
    'sends only the origin as the referrer from %s, keeping the other security headers',
    async (url) => {
      const { headers } = await get(url, { cookie })

      expect(headers['referrer-policy']).toBe('strict-origin')
      expect(headers['strict-transport-security']).toContain('max-age=')
      expect(headers['x-frame-options']).toBe('DENY')
    }
  )

  test.each([
    '/SEARCH?search=Smith',
    '//search?search=Smith',
    '/nope?search=Smith',
    '/public/x?search=Smith'
  ])(
    'the 404 page for %s loads neither and sends only the origin as the referrer',
    async (url) => {
      const { statusCode, result, headers } = await get(url, { cookie })

      expect(statusCode).toBe(statusCodes.notFound)
      expect(result).not.toContain('js-analytics-config')
      expect(result).not.toContain('govuk-cookie-banner')
      expect(headers['referrer-policy']).toBe('strict-origin')
    }
  )

  test('sends only the origin as the referrer from public pages too', async () => {
    const { headers } = await get('/')

    expect(headers['referrer-policy']).toBe('strict-origin')
  })
})
