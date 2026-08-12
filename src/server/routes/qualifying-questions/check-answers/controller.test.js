import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getSessionCookie } from '#/test-helpers/session-helpers.js'

describe('#checkAnswersController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /check-answers', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/check-answers'
      })

      expect(result).toEqual(expect.stringContaining('Check Answers |'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should show the answers a user gave, using the wording from the question pages', async () => {
      const cookie = await getSessionCookie(server, '/business-activities')

      const answer = (url, payload) =>
        server.inject({ method: 'POST', url, headers: { cookie }, payload })

      await answer('/business-activities', {
        'business-activities': ['manufacture', 'seller-amateur']
      })
      await answer('/address-activity', { 'address-activities': ['store'] })
      await answer('/quantity', {
        'quantity-type': 'area',
        'quantity-amount': '',
        'quantity-area': '67'
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/check-answers',
        headers: { cookie }
      })

      expect(result).toEqual(
        expect.stringContaining(
          'Manufacture, process or import<br>Sell amateur PPPs'
        )
      )
      expect(result).toEqual(
        expect.stringContaining(
          'Store plant protection products (PPPs) or adjuvants'
        )
      )
      expect(result).toEqual(expect.stringContaining('67 hectares'))
    })

    test('Should omit the main customer row when that question was skipped', async () => {
      const cookie = await getSessionCookie(server, '/business-activities')

      await server.inject({
        method: 'POST',
        url: '/business-activities',
        headers: { cookie },
        payload: { 'business-activities': ['seller-amateur'] }
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/check-answers',
        headers: { cookie }
      })

      expect(result).not.toEqual(expect.stringContaining('Main customer'))
    })

    test('Should escape answers rather than trusting them as markup', async () => {
      const cookie = await getSessionCookie(server, '/business-name')

      await server.inject({
        method: 'POST',
        url: '/business-name',
        headers: { cookie },
        payload: { 'business-name': '<img src=x onerror=alert(1)>' }
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/check-answers',
        headers: { cookie }
      })

      expect(result).not.toEqual(expect.stringContaining('<img src=x'))
      expect(result).toEqual(expect.stringContaining('&lt;img src=x'))
    })
  })

  describe('POST /check-answers', () => {
    test('Should redirect to confirmation page', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/check-answers',
        payload: {}
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/confirmation')
    })
  })
})
