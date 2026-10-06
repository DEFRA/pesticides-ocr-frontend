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
        payload: { businessActivities: ['manufacture'] }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/main-customer')
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
  })

  describe('Pre-populating from the session', () => {
    const url = '/business-activities'

    test('Should check the activities held in the session', async () => {
      const cookie = await answerStep(server, {
        url,
        payload: { businessActivities: ['manufacture', 'seller-amateur'] }
      })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'businessActivities')).toEqual(['manufacture', 'seller-amateur'])
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
