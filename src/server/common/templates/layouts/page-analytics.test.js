import { vi } from 'vitest'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  getSessionCookie,
  signInCaseOfficer
} from '#/test-helpers/session-helpers.js'
import { completeJourney } from '#/test-helpers/journey-helpers.js'

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

  describe('journey events (EQ-533)', () => {
    const event = (html) => html.match(/data-event="([^"]+)"/)?.[1]

    afterEach(() => {
      vi.restoreAllMocks()
    })

    const firstThenReload = async (url) => {
      const first = await get(url)
      const cookie = first.headers['set-cookie'][0].split(';')[0]
      return { first, reload: await get(url, { cookie }) }
    }

    const register = async (cookie, reference) => {
      await completeJourney(server, cookie)
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        status: statusCodes.created,
        ok: true,
        json: async () => ({ reference })
      })
      return server.inject({
        method: 'POST',
        url: '/check-answers',
        headers: { cookie },
        payload: {}
      })
    }

    test('a page that is not a journey milestone carries no event', async () => {
      expect(event((await get('/')).result)).toBeUndefined()
    })

    test('the first question carries journey_start once per session', async () => {
      const { first, reload } = await firstThenReload('/business-activities')

      expect(event(first.result)).toBe('journey_start')
      expect(event(reload.result)).toBeUndefined()
    })

    test('the not-eligible page carries journey_not_eligible once per session', async () => {
      const { first, reload } = await firstThenReload('/not-eligible')

      expect(event(first.result)).toBe('journey_not_eligible')
      expect(event(reload.result)).toBeUndefined()
    })

    test('the confirmation carries registration_complete once per registration', async () => {
      const cookie = await getSessionCookie(server, '/business-activities')

      await register(cookie, 'PPP-1A2-B3C')
      const confirmation = await get('/confirmation', { cookie })
      const reload = await get('/confirmation', { cookie })
      await register(cookie, 'PPP-9Z8-Y7X')
      const second = await get('/confirmation', { cookie })

      expect(event(confirmation.result)).toBe('registration_complete')
      expect(confirmation.headers['cache-control']).toBe('no-store')
      expect(event(reload.result)).toBeUndefined()
      expect(event(second.result)).toBe('registration_complete')
    })

    test.each(['/business-activities', '/not-eligible'])(
      '%s is not cached, so going back asks the server again',
      async (url) => {
        const { headers } = await get(url)

        expect(headers['cache-control']).toBe('no-store')
      }
    )
  })
})
