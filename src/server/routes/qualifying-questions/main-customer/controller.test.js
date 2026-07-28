import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

describe('#mainCustomerController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /main-customer', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/main-customer'
      })

      expect(result).toEqual(expect.stringContaining('Main Customer |'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('POST /main-customer', () => {
    test('Should redirect to business name page', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/main-customer',
        payload: { 'main-customer': 'professional' }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/business-name')
    })

    test('Should return view with error message', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/main-customer',
        payload: {}
      })

      expect(result).toEqual(expect.stringContaining('Select a customer type'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })
})
