import { createServer } from '#/server/server.js'
import { answerStep, revisitStep, checkedValues } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

describe('#whoAppliesController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /who-applies', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/who-applies'
      })

      expect(result).toEqual(expect.stringContaining('Who applies PPPs for your organisation? |'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should show the question and both options', async () => {
      const page = await revisitStep(server, { url: '/who-applies' })
      const labelFor = (value) => page(`input[value="${value}"]`).next('label').text().trim()

      expect(page('h1').text().trim()).toBe('Who applies PPPs for your organisation?')
      expect(labelFor('self')).toBe('We apply PPPs ourselves or on behalf of other organisations')
      expect(labelFor('contractor')).toBe('Another organisation applies PPPs on our behalf')
    })
  })

  describe('POST /who-applies', () => {
    const postWhoApplies = (payload) =>
      injectWithSession(server, { method: 'POST', url: '/who-applies', payload })

    test('Should not error when the session has expired', async () => {
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/who-applies',
        payload: { whoApplies: 'self' }
      })

      expect(statusCode).toBe(statusCodes.redirect)
    })

    test('Should redirect to the PPP sectors page when the organisation applies PPPs itself', async () => {
      const { statusCode, headers } = await postWhoApplies({ whoApplies: 'self' })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/ppp-sectors')
    })

    test('Should redirect to the contractor address page when another organisation applies PPPs', async () => {
      const { statusCode, headers } = await postWhoApplies({ whoApplies: 'contractor' })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/contractor-address')
    })

    test('Should return view with error message when nothing is selected', async () => {
      const { result, statusCode } = await postWhoApplies({})

      expect(result).toEqual(
        expect.stringContaining('Select who applies PPPs for your organisation')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should return view with error message for an unknown option', async () => {
      const { result, statusCode } = await postWhoApplies({ whoApplies: 'someone-else' })

      expect(result).toEqual(
        expect.stringContaining('Select who applies PPPs for your organisation')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('Pre-populating from the session', () => {
    const url = '/who-applies'

    test('Should check the option held in the session', async () => {
      const cookie = await answerStep(server, { url, payload: { whoApplies: 'contractor' } })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'whoApplies')).toEqual(['contractor'])
    })

    test('Should check nothing when no option is held in the session', async () => {
      const page = await revisitStep(server, { url })

      expect(checkedValues(page, 'whoApplies')).toEqual([])
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })
})
