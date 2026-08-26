import { createServer } from '#/server/server.js'
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
        'member-schemes': 'red-tractor',
        'member-schemes-other': ''
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/additional-addresses')
    })

    test('Should redirect to additional-addresses page when several schemes are selected', async () => {
      const { statusCode, headers } = await postSchemes({
        'member-schemes': ['leaf', 'sqc'],
        'member-schemes-other': ''
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/additional-addresses')
    })

    test('Should redirect to additional-addresses page when only Other is given', async () => {
      const { statusCode, headers } = await postSchemes({
        'member-schemes-other': 'Vineyard assurance'
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/additional-addresses')
    })

    test('Should redirect to additional-addresses page when neither is given, as the question is optional', async () => {
      const { statusCode, headers } = await postSchemes({
        'member-schemes-other': ''
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/additional-addresses')
    })

    test('Should show an error when both a scheme and Other are given', async () => {
      const { statusCode, result } = await postSchemes({
        'member-schemes': 'red-tractor',
        'member-schemes-other': 'Vineyard assurance'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(selectSchemeOrOther))
    })

    test('Should show an error when several schemes and Other are given', async () => {
      const { statusCode, result } = await postSchemes({
        'member-schemes': ['leaf', 'sqc'],
        'member-schemes-other': 'Vineyard assurance'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(selectSchemeOrOther))
    })

    test('Should show an error when Other is longer than 100 characters', async () => {
      const { statusCode, result } = await postSchemes({
        'member-schemes-other': 'x'.repeat(101)
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Please use 100 characters or fewer')
      )
    })
  })
})
