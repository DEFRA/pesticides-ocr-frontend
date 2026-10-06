import { createServer } from '#/server/server.js'
import { answerStep, revisitStep, checkedValues } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  createSessionRequest,
  injectWithSession,
  sessionResponseToolkit
} from '#/test-helpers/session-helpers.js'
import { get as getHandler } from './controller.js'

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
      expect(result).toEqual(
        expect.stringContaining('Keep records of plant protection products (PPPs)')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('Address line one hint', () => {
    const readContext = (formSession) => {
      const { request } = createSessionRequest({ formSession })

      return getHandler.handler(request, sessionResponseToolkit).context
    }

    test('Should read the first line of the saved business address', () => {
      const { currentAddressLineOne } = readContext({
        address: {
          addressLine1: 'Lower Meadow Barn',
          addressTown: 'Farm town',
          addressPostcode: 'LS1 1AA'
        }
      })

      expect(currentAddressLineOne).toBe('Lower Meadow Barn')
    })

    test('Should be undefined when no address has been answered yet', () => {
      expect(readContext().currentAddressLineOne).toBeUndefined()
    })
  })

  describe('POST /address-activity', () => {
    test('Should redirect to quantity page', async () => {
      const { statusCode, headers } = await injectWithSession(server, {
        method: 'POST',
        url: '/address-activity',
        payload: { addressActivities: ['use'] }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/quantity')
    })

    test('Should return view with error message', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/address-activity',
        payload: { addressActivities: [] }
      })

      expect(result).toEqual(expect.stringContaining('Select at least one address activity'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('Pre-populating from the session', () => {
    const url = '/address-activity'

    test('Should check the activities held in the session', async () => {
      const cookie = await answerStep(server, {
        url,
        payload: { addressActivities: ['store', 'records'] }
      })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'addressActivities')).toEqual(['store', 'records'])
    })

    test('Should check nothing when no activities are held in the session', async () => {
      const page = await revisitStep(server, { url })

      expect(checkedValues(page, 'addressActivities')).toEqual([])
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })
})
