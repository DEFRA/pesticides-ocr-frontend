import { createServer } from '#/server/server.js'
import { answerStep, revisitStep, checkedValues } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

describe('#memberSchemesController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /member-schemes', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/member-schemes'
      })

      expect(result).toEqual(expect.stringContaining('Member Schemes |'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('POST /member-schemes', () => {
    const selectSchemeOrOther =
      'Select a member scheme or describe your main type of work'

    const postSchemes = (payload) =>
      injectWithSession(server, {
        method: 'POST',
        url: '/member-schemes',
        payload
      })

    test('Should redirect to additional-addresses page when one scheme is selected', async () => {
      const { statusCode, headers } = await postSchemes({
        memberSchemes: 'red-tractor',
        memberSchemesOther: ''
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/additional-addresses')
    })

    test('Should redirect to additional-addresses page when several schemes are selected', async () => {
      const { statusCode, headers } = await postSchemes({
        memberSchemes: ['leaf', 'sqc'],
        memberSchemesOther: ''
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/additional-addresses')
    })

    test('Should redirect to additional-addresses page when only Other is given', async () => {
      const { statusCode, headers } = await postSchemes({
        memberSchemesOther: 'Vineyard assurance'
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/additional-addresses')
    })

    test('Should redirect to additional-addresses page when neither is given, as the question is optional', async () => {
      const { statusCode, headers } = await postSchemes({
        memberSchemesOther: ''
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/additional-addresses')
    })

    test('Should show an error when both a scheme and Other are given', async () => {
      const { statusCode, result } = await postSchemes({
        memberSchemes: 'red-tractor',
        memberSchemesOther: 'Vineyard assurance'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(selectSchemeOrOther))
    })

    test('Should show an error when several schemes and Other are given', async () => {
      const { statusCode, result } = await postSchemes({
        memberSchemes: ['leaf', 'sqc'],
        memberSchemesOther: 'Vineyard assurance'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(selectSchemeOrOther))
    })

    test('Should show an error when Other is longer than 100 characters', async () => {
      const { statusCode, result } = await postSchemes({
        memberSchemesOther: 'x'.repeat(101)
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Please use 100 characters or fewer')
      )
    })
  })

  describe('Pre-populating from the session', () => {
    const url = '/member-schemes'

    test('Should check the options held in the session', async () => {
      const cookie = await answerStep(server, { url, payload: { memberSchemes: ['leaf'] } })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'memberSchemes')).toEqual(['leaf'])
      expect(page('#memberSchemesOther').val()).toBe('')
    })

    test('Should populate the other text held in the session', async () => {
      const cookie = await answerStep(server, { url, payload: { memberSchemesOther: 'Something else' } })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'memberSchemes')).toEqual([])
      expect(page('#memberSchemesOther').val()).toBe('Something else')
    })

    test('Should render the fields empty when nothing is held in the session', async () => {
      const page = await revisitStep(server, { url })

      expect(checkedValues(page, 'memberSchemes')).toEqual([])
      expect(page('#memberSchemesOther').val()).toBe('')
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })
})
