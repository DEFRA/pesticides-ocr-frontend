import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

describe('#additionalBusinessAddressController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /additional-addresses/address', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/additional-addresses/address'
      })

      expect(result).toEqual(
        expect.stringContaining('Additional business address')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should post the form back to this page', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/additional-addresses/address'
      })

      expect(result).toEqual(
        expect.stringContaining('action="/additional-addresses/address"')
      )
    })
  })

  describe('POST /additional-addresses/address', () => {
    const postAddress = (payload) =>
      injectWithSession(server, {
        method: 'POST',
        url: '/additional-addresses/address',
        payload
      })

    const validAddress = {
      'address-line-1': 'Highfield Farm',
      'address-line-2': '',
      'address-town': 'Farm town',
      'address-county': '',
      'address-postcode': 'PH1 1FT'
    }

    test('Should redirect to the additional address contact page', async () => {
      const { statusCode, headers } = await postAddress(validAddress)

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/additional-addresses/contact')
    })

    test('Should redirect when the optional fields are omitted', async () => {
      const { statusCode, headers } = await postAddress({
        'address-line-1': 'Highfield Farm',
        'address-town': 'Farm town',
        'address-postcode': 'PH1 1FT'
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/additional-addresses/contact')
    })

    test('Should return view with error messages when required fields are empty', async () => {
      const { statusCode, result } = await postAddress({
        'address-line-1': '',
        'address-line-2': '',
        'address-town': '',
        'address-county': '',
        'address-postcode': ''
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(
          'Enter the first line of your business&#39; address'
        )
      )
      expect(result).toEqual(expect.stringContaining('Enter town or city'))
      expect(result).toEqual(expect.stringContaining('Enter your postcode'))
    })

    test.each([
      ['address-line-1', 'Enter the first line of your business&#39; address'],
      ['address-town', 'Enter town or city'],
      ['address-postcode', 'Enter your postcode']
    ])(
      'Should return view with an error message when %s is missing',
      async (field, message) => {
        const { statusCode, result } = await postAddress({
          ...validAddress,
          [field]: ''
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toEqual(expect.stringContaining(message))
      }
    )
  })
})
