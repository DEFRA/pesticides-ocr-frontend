import { load } from 'cheerio'

import { createServer } from '#/server/server.js'
import { answerStep, completeJourney, revisitStep, checkedValues } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

describe('#businessAddressManualController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const url = '/business-address/manual'

  const address = {
    addressLine1: '1 High Street',
    addressLine2: 'Flat 2',
    addressTown: 'York',
    addressPostcode: 'YO1 7HH',
    addressRegion: 'england'
  }

  const labelFor = (page, id) => page(`label[for="${id}"]`).text().trim()

  describe('GET /business-address/manual', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toEqual(expect.stringContaining('Main Site Address |'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should ask for each part of the address', async () => {
      const page = await revisitStep(server, { url })

      expect(page('h1').text()).toBe('Main site address')
      expect(page('main p.govuk-body').first().text()).toBe(
        'This is the address most relevant to the PPP activities you are responsible for.'
      )
      expect(labelFor(page, 'addressLine1')).toBe('Address line 1')
      expect(labelFor(page, 'addressLine2')).toBe('Address line 2 (optional)')
      expect(labelFor(page, 'addressTown')).toBe('Town or city')
      expect(labelFor(page, 'addressPostcode')).toBe('Postcode')
      expect(page('#addressCounty')).toHaveLength(0)
      expect(page('button[type="submit"]').text().trim()).toBe('Continue')
    })

    test('Should offer England, Scotland and Wales as the region', async () => {
      const page = await revisitStep(server, { url })

      expect(page('legend').text().trim()).toBe('Country')
      expect(page('legend').hasClass('govuk-fieldset__legend--s')).toBe(true)
      expect(
        page('input[name="addressRegion"]')
          .map((_index, input) => ({
            value: page(input).val(),
            text: labelFor(page, page(input).attr('id'))
          }))
          .get()
      ).toEqual([
        { value: 'england', text: 'England' },
        { value: 'scotland', text: 'Scotland' },
        { value: 'wales', text: 'Wales' }
      ])
    })

    test('Should link to the page for an address outside Great Britain', async () => {
      const page = await revisitStep(server, { url })

      expect(
        page('a:contains("Our main business address is outside of Great Britain")').attr('href')
      ).toBe('/business-address/international')
    })

    test('Should link back to the search', async () => {
      const page = await revisitStep(server, { url })

      expect(page('.govuk-back-link')).toHaveLength(1)
      expect(page('.govuk-back-link').attr('href')).toBe('/business-address')
    })

    test('Should link back to the search in change mode', async () => {
      const cookie = await completeJourney(server)

      const page = await revisitStep(server, { url: `${url}?change=true`, cookie })

      expect(page('.govuk-back-link')).toHaveLength(1)
      expect(page('.govuk-back-link').attr('href')).toBe('/business-address?change=true')
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })

  describe('POST /business-address/manual', () => {
    test.each([
      [address],
      [{ ...address, addressLine2: '' }],
      [{ ...address, addressPostcode: 'yo17hh', addressRegion: 'wales' }]
    ])('Should redirect to business contact page for %o', async (payload) => {
      const { statusCode, headers } = await injectWithSession(server, {
        method: 'POST',
        url,
        payload
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/business-contact')
    })

    test('Should return to check answers in change mode', async () => {
      const cookie = await completeJourney(server)

      const { headers } = await server.inject({
        method: 'POST',
        url: `${url}?change=true`,
        headers: { cookie },
        payload: address
      })

      expect(headers.location).toBe('/check-answers')
    })

    test('Should show the address on check answers, ending with the region', async () => {
      const cookie = await completeJourney(server)
      await answerStep(server, { url, cookie, payload: { ...address, addressLine2: '' } })

      const { result } = await server.inject({
        method: 'GET',
        url: '/check-answers',
        headers: { cookie }
      })

      expect(result).toEqual(expect.stringContaining('1 High Street<br>York<br>YO1 7HH<br>England'))
    })

    test.each([
      ['addressLine1', { addressLine1: '' }, "Enter the first line of your business' address"],
      ['addressLine1', { addressLine1: '   ' }, "Enter the first line of your business' address"],
      ['addressTown', { addressTown: '' }, 'Enter town or city'],
      ['addressPostcode', { addressPostcode: '' }, 'Enter a postcode'],
      ['addressPostcode', { addressPostcode: 'not a postcode' }, 'Enter a real postcode'],
      ['addressRegion', { addressRegion: undefined }, 'Select a country'],
      ['addressRegion', { addressRegion: 'france' }, 'Select a country'],
      ['addressLine1', { addressLine1: 'a'.repeat(101) }, 'Address line 1 must be 100 characters or less'],
      ['addressLine2', { addressLine2: 'a'.repeat(101) }, 'Address line 2 must be 100 characters or less'],
      ['addressTown', { addressTown: 'a'.repeat(101) }, 'Town or city must be 100 characters or less']
    ])('Should show an error for %s given %o', async (field, change, message) => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url,
        payload: { ...address, ...change }
      })
      const page = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect(page('.govuk-error-summary a').text().trim()).toBe(message)
      expect(page('.govuk-error-summary a').attr('href')).toBe(`#${field}`)
      expect(page(`#${field}-error`).text()).toEqual(expect.stringContaining(message))
    })

    test('Should show an error for every required field left empty', async () => {
      const { result } = await server.inject({ method: 'POST', url, payload: {} })
      const page = load(result)

      expect(
        page('.govuk-error-summary a')
          .map((_index, link) => page(link).text().trim())
          .get()
      ).toEqual([
        "Enter the first line of your business' address",
        'Enter town or city',
        'Enter a postcode',
        'Select a country'
      ])
    })

    test('Should keep the back link and outside Great Britain link when showing an error', async () => {
      const { result } = await server.inject({
        method: 'POST',
        url: `${url}?change=true`,
        payload: {}
      })
      const page = load(result)

      expect(page('.govuk-back-link').attr('href')).toBe('/business-address?change=true')
      expect(
        page('a:contains("Our main business address is outside of Great Britain")').attr('href')
      ).toBe('/business-address/international')
    })
  })

  describe('Pre-populating from the session', () => {
    test('Should populate the address held in the session, including the region', async () => {
      const cookie = await answerStep(server, { url, payload: { ...address, addressRegion: 'scotland' } })

      const page = await revisitStep(server, { url, cookie })

      expect(page('#addressLine1').val()).toBe('1 High Street')
      expect(page('#addressLine2').val()).toBe('Flat 2')
      expect(page('#addressTown').val()).toBe('York')
      expect(page('#addressPostcode').val()).toBe('YO1 7HH')
      expect(checkedValues(page, 'addressRegion')).toEqual(['scotland'])
    })

    test('Should render the form empty when no address is held in the session', async () => {
      const page = await revisitStep(server, { url })

      expect(page('#addressLine1').val()).toBeFalsy()
      expect(page('#addressPostcode').val()).toBeFalsy()
      expect(checkedValues(page, 'addressRegion')).toEqual([])
    })

    test('Should keep the entered values when there is an error', async () => {
      const { result } = await server.inject({
        method: 'POST',
        url,
        payload: { ...address, addressPostcode: 'not a postcode', addressRegion: 'wales' }
      })
      const page = load(result)

      expect(page('#addressLine1').val()).toBe('1 High Street')
      expect(page('#addressPostcode').val()).toBe('not a postcode')
      expect(checkedValues(page, 'addressRegion')).toEqual(['wales'])
    })
  })
})
