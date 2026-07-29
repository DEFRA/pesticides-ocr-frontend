import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

describe('#businessNameController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /business-name', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/business-name'
      })

      expect(result).toEqual(expect.stringContaining('Business Name |'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('POST /business-name', () => {
    test('Should redirect to business address page', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/business-name',
        payload: { 'business-name': 'Pesticides Ltd' }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/business-address')
    })

    test('Should return view with error message', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/business-name',
        payload: { 'business-name': '' }
      })

      expect(result).toEqual(expect.stringContaining('Enter a business name'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })
})
