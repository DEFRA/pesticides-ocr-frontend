import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

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
  })

  describe('POST /business-address', () => {
    test('Should redirect to business contact page', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/business-address',
        payload: {
          'address-line-1': 'Highfield Farm',
          'address-line-2': '',
          'address-town': 'Farm town',
          'address-county': '',
          'address-postcode': 'PH1 1FT'
        }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/business-contact')
    })

    test('Should return view with error message', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/business-address',
        payload: {
          'address-line-1': '',
          'address-line-2': '',
          'address-town': '',
          'address-county': '',
          'address-postcode': ''
        }
      })

      expect(result).toEqual(expect.stringContaining('Enter town or city'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })
})
