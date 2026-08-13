import { createServer } from '#/server/server.js'
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
      expect(result).toEqual(
        expect.stringContaining('Manufacture, process or import')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('POST /business-activities', () => {
    test('Should redirect to main customer page', async () => {
      const { statusCode, headers } = await injectWithSession(server, {
        method: 'POST',
        url: '/business-activities',
        payload: { 'business-activities': ['manufacture'] }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/main-customer')
    })

    test('Should return view with error message', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/business-activities',
        payload: { 'business-activities': [] }
      })

      expect(result).toEqual(expect.stringContaining('Select at least one business activity'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })
})
