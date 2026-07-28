import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

describe('#addressActivityController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /address-activity', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/address-activity'
      })

      expect(result).toEqual(expect.stringContaining('Address Activity |'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('POST /address-activity', () => {
    test('Should redirect to quantity page', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/address-activity',
        payload: { 'address-activities': ['use'] }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/quantity')
    })

    test('Should return view with error message', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/address-activity',
        payload: { 'address-activities': [] }
      })

      expect(result).toEqual(expect.stringContaining('Select at least one address activity'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })
})
