import { load } from 'cheerio'

import { createServer } from '#/server/server.js'
import { answerStep, revisitStep, checkedValues } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

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
      expect(result).toEqual(expect.stringContaining('Manufacturing PPPs'))
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

    test('Should offer only storing as an exclusive option after an "or" divider', async () => {
      const { result } = await server.inject({ method: 'GET', url: '/business-activities' })
      const page = load(result)
      const onlyStoring = page('input[value="only-storing"]')

      expect(page('.govuk-checkboxes__divider').text().trim()).toBe('or')
      expect(onlyStoring.attr('data-behaviour')).toBe('exclusive')
      expect(page('input[name="businessActivities"]').last().val()).toBe('only-storing')
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
      payload: { businessActivities: ['importing', 'selling'] }
    })

    const { result } = await server.inject({
      method: 'GET',
      url: '/business-activities',
      headers: { cookie }
    })

    const checked = [...result.matchAll(/value="([^"]+)" checked/g)].map(
      ([, value]) => value
    )
    expect(checked).toEqual(['importing', 'selling'])
  })

  describe('POST /business-activities', () => {
    test.each([
      [['manufacturing']],
      [['using', 'selling', 'distributing']],
      [['only-storing']]
    ])('Should redirect to the business name page for %o', async (businessActivities) => {
      const { statusCode, headers } = await injectWithSession(server, {
        method: 'POST',
        url: '/business-activities',
        payload: { businessActivities }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/business-name')
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

    test('Should not accept only storing alongside other activities', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/business-activities',
        payload: { businessActivities: ['selling', 'only-storing'] }
      })

      expect(result).toEqual(
        expect.stringContaining(
          'Select either your activities or &#39;Only storing PPPs for other businesses&#39;'
        )
      )
      expect(checkedValues(load(result), 'businessActivities')).toEqual([
        'selling',
        'only-storing'
      ])
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('Pre-populating from the session', () => {
    const url = '/business-activities'

    test('Should check the activities held in the session', async () => {
      const cookie = await answerStep(server, {
        url,
        payload: { businessActivities: ['manufacturing', 'processing'] }
      })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'businessActivities')).toEqual(['manufacturing', 'processing'])
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
