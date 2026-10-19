import { load } from 'cheerio'

import { createServer } from '#/server/server.js'
import { answerStep, revisitStep } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

describe('#businessAddressController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /business-address', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/business-address'
      })

      expect(result).toEqual(expect.stringContaining('Business Address |'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should ask for a postcode and building to find the address', async () => {
      const page = await revisitStep(server, { url: '/business-address' })

      expect(page('h1').text()).toBe('What is the main address for your business or organisation?')
      expect(page('label[for="addressPostcode"]').text().trim()).toBe('Postcode')
      expect(page('#addressPostcode-hint').text().trim()).toBe('For example AA3 1AB')
      expect(page('label[for="addressBuilding"]').text().trim()).toBe(
        'Building name or number (optional)'
      )
      expect(page('#addressBuilding-hint').text().trim()).toBe('For example, 15 or Prospect Cottage')
      expect(page('button[type="submit"]').text().trim()).toBe('Find an address')
    })

    test('Should offer to enter an address manually next to the button', async () => {
      const page = await revisitStep(server, { url: '/business-address' })
      const group = page('form .govuk-button-group')

      expect(group.find('button[type="submit"]').text().trim()).toBe('Find an address')
      expect(group.find('p').text().replaceAll(/\s+/g, ' ').trim()).toBe(
        'or enter an address manually'
      )
      expect(group.find('a').text().trim()).toBe('enter an address manually')
      expect(group.find('a').attr('href')).toBe('/business-address/manual')
    })

    test('Should keep change mode on the manual entry link', async () => {
      const page = await revisitStep(server, { url: '/business-address?change=true' })

      expect(page('a:contains("enter an address manually")').attr('href')).toBe(
        '/business-address/manual?change=true'
      )
    })
  })

  describe('POST /business-address', () => {
    test.each([
      [{ addressPostcode: 'AA3 1AB', addressBuilding: 'Pesticides House' }],
      [{ addressPostcode: 'aa31ab', addressBuilding: '' }],
      [{ addressPostcode: 'SW1A 1AA' }]
    ])('Should redirect to the address lookup results for %o', async (payload) => {
      const { statusCode, headers } = await injectWithSession(server, {
        method: 'POST',
        url: '/business-address',
        payload
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/business-address/select')
    })

    test('Should keep change mode when going to the address lookup results', async () => {
      const { headers } = await injectWithSession(server, {
        method: 'POST',
        url: '/business-address?change=true',
        payload: { addressPostcode: 'AA3 1AB' }
      })

      expect(headers.location).toBe('/business-address/select?change=true')
    })

    test.each([
      ['', 'Enter a postcode'],
      ['   ', 'Enter a postcode'],
      ['not a postcode', 'Enter a real postcode'],
      ['AA3', 'Enter a real postcode']
    ])('Should show an error for the postcode %o', async (addressPostcode, message) => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/business-address',
        payload: { addressPostcode, addressBuilding: 'Pesticides House' }
      })

      expect(result).toEqual(expect.stringContaining(message))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should still offer manual entry, keeping change mode, when the postcode is not valid', async () => {
      const { result } = await server.inject({
        method: 'POST',
        url: '/business-address?change=true',
        payload: { addressPostcode: '' }
      })

      expect(load(result)('a:contains("enter an address manually")').attr('href')).toBe(
        '/business-address/manual?change=true'
      )
    })
  })

  describe('Pre-populating from the session', () => {
    const url = '/business-address'
    const search = { addressPostcode: 'AA3 1AB', addressBuilding: 'Pesticides House' }

    test('Should populate the search held in the session', async () => {
      const cookie = await answerStep(server, { url, payload: search })

      const page = await revisitStep(server, { url, cookie })

      expect(page('#addressPostcode').val()).toBe('AA3 1AB')
      expect(page('#addressBuilding').val()).toBe('Pesticides House')
    })

    test('Should render the search empty when none is held in the session', async () => {
      const page = await revisitStep(server, { url })

      expect(page('#addressPostcode').val()).toBeFalsy()
      expect(page('#addressBuilding').val()).toBeFalsy()
    })

    test('Should keep the entered values when the postcode is not valid', async () => {
      const { result } = await server.inject({
        method: 'POST',
        url,
        payload: { addressPostcode: 'not a postcode', addressBuilding: 'Pesticides House' }
      })

      expect(result).toEqual(expect.stringContaining('value="not a postcode"'))
      expect(result).toEqual(expect.stringContaining('value="Pesticides House"'))
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })
})
