import { createServer } from '#/server/server.js'
import { answerStep, revisitStep } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

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
      const { statusCode, headers } = await injectWithSession(server, {
        method: 'POST',
        url: '/business-name',
        payload: { businessName: 'Pesticides Ltd' }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/business-address')
    })

    test('Should return view with error message', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/business-name',
        payload: { businessName: '' }
      })

      expect(result).toEqual(expect.stringContaining('Enter a business name'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('Pre-populating from the session', () => {
    const url = '/business-name'

    test('Should populate the business name held in the session', async () => {
      const cookie = await answerStep(server, { url, payload: { businessName: 'Pesticides Ltd' } })

      const page = await revisitStep(server, { url, cookie })

      expect(page('#businessName').val()).toBe('Pesticides Ltd')
    })

    test('Should render the business name empty when none is held in the session', async () => {
      const page = await revisitStep(server, { url })

      expect(page('#businessName').val()).toBeFalsy()
    })

    test('Should save an amended business name', async () => {
      const cookie = await answerStep(server, { url, payload: { businessName: 'Pesticides Ltd' } })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url,
        payload: { businessName: 'Crop Care Ltd' },
        headers: { cookie }
      })
      const page = await revisitStep(server, { url, cookie })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/business-address')
      expect(page('#businessName').val()).toBe('Crop Care Ltd')
    })

    test('Should not store the page re-rendered after a validation error', async () => {
      const { headers } = await server.inject({
        method: 'POST',
        url,
        payload: { businessName: '' }
      })

      expect(headers['cache-control']).toBe('no-store')
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })
})
