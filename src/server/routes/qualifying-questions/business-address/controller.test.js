import { createServer } from '#/server/server.js'
import { answerStep, revisitStep } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

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
      const { statusCode, headers } = await injectWithSession(server, {
        method: 'POST',
        url: '/business-address',
        payload: {
          addressLine1: 'Highfield Farm',
          addressLine2: '',
          addressTown: 'Farm town',
          addressCounty: '',
          addressPostcode: 'PH1 1FT'
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
          addressLine1: '',
          addressLine2: '',
          addressTown: '',
          addressCounty: '',
          addressPostcode: ''
        }
      })

      expect(result).toEqual(expect.stringContaining('Enter town or city'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('Pre-populating from the session', () => {
    const url = '/business-address'

    const address = {
      addressLine1: 'Lower Meadow Barn',
      addressLine2: 'Mill Lane',
      addressTown: 'Farm town',
      addressCounty: 'Farmshire',
      addressPostcode: 'LS1 1AA'
    }

    test('Should populate the address held in the session', async () => {
      const cookie = await answerStep(server, { url, payload: address })

      const page = await revisitStep(server, { url, cookie })

      Object.entries(address).forEach(([field, value]) => {
        expect(page(`#${field}`).val()).toBe(value)
      })
    })

    test('Should render the address empty when none is held in the session', async () => {
      const page = await revisitStep(server, { url })

      Object.keys(address).forEach((field) => {
        expect(page(`#${field}`).val()).toBeFalsy()
      })
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })
})
