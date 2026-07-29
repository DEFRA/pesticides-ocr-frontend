import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

describe('#businessContactController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /business-contact', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/business-contact'
      })

      expect(result).toEqual(expect.stringContaining('Business Contact |'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('POST /business-contact', () => {
    test('Should redirect to address activity page', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/business-contact',
        payload: {
          'contact-name': 'John Smith',
          'contact-telephone': '01234 567890',
          'contact-email': 'John.Smith@pesticides.co.uk'
        }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/address-activity')
    })

    test('Should return view with error message', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/business-contact',
        payload: {
          'contact-name': '',
          'contact-telephone': '',
          'contact-email': ''
        }
      })

      expect(result).toEqual(expect.stringContaining('Enter a contact name'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })
})
