import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getSessionCookie } from '#/test-helpers/session-helpers.js'

const referencePattern = /PPP-\d{3}-\d{2}[A-Z]/

describe('#confirmationController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const loadConfirmation = async (cookie) => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/confirmation',
      ...(cookie ? { headers: { cookie } } : {})
    })

    return {
      result,
      statusCode,
      reference: (result.match(referencePattern) ?? [])[0]
    }
  }

  describe('GET /confirmation', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await loadConfirmation()

      expect(result).toEqual(expect.stringContaining('Confirmation |'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should show the reference number in the confirmation panel', async () => {
      const { result, reference } = await loadConfirmation()

      expect(reference).toMatch(referencePattern)
      expect(result).toEqual(
        expect.stringContaining(
          `Your reference number<br><strong>${reference}</strong>`
        )
      )
    })

    test('Should keep the same reference number when the page is reloaded', async () => {
      const cookie = await getSessionCookie(server, '/confirmation')

      const first = await loadConfirmation(cookie)
      const second = await loadConfirmation(cookie)
      const third = await loadConfirmation(cookie)

      expect(first.reference).toMatch(referencePattern)
      expect(second.reference).toBe(first.reference)
      expect(third.reference).toBe(first.reference)
    })

    test('Should keep the reference number when the user submits check answers again', async () => {
      // /check-answers only reads the session, so it issues no cookie of its
      // own; the journey it belongs to has to seed one first.
      const cookie = await getSessionCookie(server, '/business-activities')

      const { reference } = await loadConfirmation(cookie)

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/check-answers',
        headers: { cookie },
        payload: {}
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/confirmation')
      expect((await loadConfirmation(cookie)).reference).toBe(reference)
    })

    test('Should give each session its own reference number', async () => {
      const references = []

      for (let session = 0; session < 5; session += 1) {
        const cookie = await getSessionCookie(server, '/business-activities')
        references.push((await loadConfirmation(cookie)).reference)
      }

      for (const reference of references) {
        expect(reference).toMatch(referencePattern)
      }

      // References are random, so two sessions could legitimately coincide.
      // Sharing one reference across every session could not.
      expect(new Set(references).size).toBeGreaterThan(1)
    })
  })
})
