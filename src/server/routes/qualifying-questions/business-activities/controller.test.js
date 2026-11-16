import { load } from 'cheerio'

import { createServer } from '#/server/server.js'
import {
  answerStep,
  revisitStep,
  checkedValues,
  MANUAL_BUSINESS_ADDRESS
} from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getSessionCookie, injectWithSession } from '#/test-helpers/session-helpers.js'
import { SELLING, USING } from './items.js'

describe('#businessActivitiesController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /business-activities', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/business-activities'
      })

      expect(result).toEqual(expect.stringContaining('Business Activities |'))
      expect(result).toEqual(expect.stringContaining('Using PPPs as part of your work'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should ask the question as the page heading, with the extra content before the checkboxes', async () => {
      const { result } = await server.inject({ method: 'GET', url: '/business-activities' })
      const page = load(result)

      expect(page('h1').text().trim()).toBe('Which activities does your organisation carry out?')
      expect(page('legend').text().trim()).toBe('Which activities does your organisation carry out?')
      expect(page('legend').hasClass('govuk-visually-hidden')).toBe(true)
      expect(result).toEqual(
        expect.stringContaining(
          'These activities must be carried out in Great Britain (England, Scotland or Wales).'
        )
      )
    })

    test('Should offer only the using and selling activities', async () => {
      const { result } = await server.inject({ method: 'GET', url: '/business-activities' })
      const page = load(result)

      expect(checkedValues(page, 'businessActivities')).toEqual([])
      expect(page('input[name="businessActivities"]').map((_index, input) => page(input).val()).get()).toEqual([
        USING,
        SELLING
      ])
    })

    test('Should link back to the business address once the earlier pages are answered', async () => {
      const cookie = await getSessionCookie(server, '/business-contact')
      const answer = (url, payload) =>
        server.inject({ method: 'POST', url, headers: { cookie }, payload })

      await answer('/business-contact', {
        contactName: 'Jo Bloggs',
        contactTelephone: '01234 567890',
        contactEmail: 'jo@example.com'
      })
      await answer('/business-name', { businessName: 'Pesticides Ltd' })
      await answer('/business-address/manual', MANUAL_BUSINESS_ADDRESS)

      const page = await revisitStep(server, { url: '/business-activities', cookie })

      expect(page('.govuk-back-link').attr('href')).toBe('/business-address')
    })

    test('Should link to the not eligible page for home and garden users', async () => {
      const { result } = await server.inject({ method: 'GET', url: '/business-activities' })
      const link = load(result)('a[href="/not-eligible"]')

      expect(link.text()).toBe(
        'I only use plant protection products (PPPs) in my own home or garden'
      )
    })
  })

  test('shows the activities already chosen when the user comes back', async () => {
    const first = await server.inject({ method: 'GET', url: '/business-activities' })
    const cookie = first.headers['set-cookie'][0].split(';')[0]
    await server.inject({
      method: 'POST',
      url: '/business-activities',
      headers: { cookie },
      payload: { businessActivities: [USING, SELLING] }
    })

    const { result } = await server.inject({
      method: 'GET',
      url: '/business-activities',
      headers: { cookie }
    })

    const checked = [...result.matchAll(/value="([^"]+)" checked/g)].map(
      ([, value]) => value
    )
    expect(checked).toEqual([USING, SELLING])
  })

  describe('POST /business-activities', () => {
    test.each([
      [[USING], '/using-ppps/who-applies'],
      [[USING, SELLING], '/using-ppps/who-applies'],
      [[SELLING], '/check-answers']
    ])('Should redirect %o to %s', async (businessActivities, nextPage) => {
      const { statusCode, headers } = await injectWithSession(server, {
        method: 'POST',
        url: '/business-activities',
        payload: { businessActivities }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(nextPage)
    })

    test('Should return view with error message', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/business-activities',
        payload: { businessActivities: [] }
      })

      expect(result).toEqual(expect.stringContaining('Select at least one business activity'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should reject an old activity code', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/business-activities',
        payload: { businessActivities: ['seller-amateur'] }
      })

      expect(result).toEqual(expect.stringContaining('Select at least one business activity'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test.each(['only-storing', 'manufacturing', 'processing', 'distributing'])(
      'Should reject %s, which is no longer an activity',
      async (businessActivity) => {
        const { result, statusCode } = await server.inject({
          method: 'POST',
          url: '/business-activities',
          payload: { businessActivities: [businessActivity] }
        })

        expect(result).toEqual(expect.stringContaining('Select at least one business activity'))
        expect(statusCode).toBe(statusCodes.ok)
      }
    )

    test('Should not tick an activity whose value is part of a single rejected value', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/business-activities',
        payload: { businessActivities: 'using-x' }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Select at least one business activity'))
      expect(checkedValues(load(result), 'businessActivities')).toEqual([])
    })
  })

  describe('Pre-populating from the session', () => {
    const url = '/business-activities'

    test('Should check the activities held in the session', async () => {
      const cookie = await answerStep(server, {
        url,
        payload: { businessActivities: [USING, SELLING] }
      })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'businessActivities')).toEqual([USING, SELLING])
    })

    test('Should check nothing when no activities are held in the session', async () => {
      const page = await revisitStep(server, { url })

      expect(checkedValues(page, 'businessActivities')).toEqual([])
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })
})
