import { createServer } from '#/server/server.js'
import { answerStep, revisitStep, checkedValues } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

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
      expect(result).toEqual(
        expect.stringContaining('Both professional and amateur users')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('POST /main-customer', () => {
    test('Should redirect to business name page', async () => {
      const { statusCode, headers } = await injectWithSession(server, {
        method: 'POST',
        url: '/main-customer',
        payload: { mainCustomer: 'professional' }
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

  describe('Pre-populating from the session', () => {
    const url = '/main-customer'

    test('Should select the customer type held in the session', async () => {
      const cookie = await answerStep(server, { url, payload: { mainCustomer: 'both' } })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'mainCustomer')).toEqual(['both'])
    })

    test('Should select nothing when no customer type is held in the session', async () => {
      const page = await revisitStep(server, { url })

      expect(checkedValues(page, 'mainCustomer')).toEqual([])
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })
})
