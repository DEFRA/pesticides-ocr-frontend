import { vi } from 'vitest'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getSessionCookie } from '#/test-helpers/session-helpers.js'

describe('#confirmationController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const loadConfirmation = async (cookie) => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/confirmation',
      ...(cookie ? { headers: { cookie } } : {})
    })

    return { result, statusCode }
  }

  // The reference is issued by the backend and reaches the session by way of
  // the check answers submission, so a session under test is seeded the same
  // way, with the backend stubbed.
  const sessionWithReference = async (reference) => {
    const cookie = await getSessionCookie(server, '/business-activities')

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: statusCodes.created,
      json: async () => ({ reference })
    })

    await server.inject({
      method: 'POST',
      url: '/check-answers',
      headers: { cookie },
      payload: {}
    })

    return cookie
  }

  describe('GET /confirmation', () => {
    test('Should return view', async () => {
      const cookie = await sessionWithReference('PPP-123-45A')

      const { result, statusCode } = await loadConfirmation(cookie)

      expect(result).toEqual(expect.stringContaining('Confirmation |'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should show the reference number the backend issued in the confirmation panel', async () => {
      const cookie = await sessionWithReference('PPP-123-45A')

      const { result } = await loadConfirmation(cookie)

      expect(result).toEqual(
        expect.stringContaining(
          'Your reference number<br><strong>PPP-123-45A</strong>'
        )
      )
    })

    test('Should keep the same reference number when the page is reloaded', async () => {
      const cookie = await sessionWithReference('PPP-123-45A')

      const first = await loadConfirmation(cookie)
      const second = await loadConfirmation(cookie)
      const third = await loadConfirmation(cookie)

      expect(first.statusCode).toBe(statusCodes.ok)
      expect(second.result).toBe(first.result)
      expect(third.result).toBe(first.result)
    })

    test('Should show the latest reference when the user submits check answers again', async () => {
      const cookie = await sessionWithReference('PPP-123-45A')

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        status: statusCodes.created,
        json: async () => ({ reference: 'PPP-987-65Z' })
      })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/check-answers',
        headers: { cookie },
        payload: {}
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/confirmation')

      const { result } = await loadConfirmation(cookie)

      expect(result).toEqual(expect.stringContaining('PPP-987-65Z'))
      expect(result).not.toEqual(expect.stringContaining('PPP-123-45A'))
    })

    test('Should give each session the reference issued for it', async () => {
      const first = await sessionWithReference('PPP-111-11A')
      const second = await sessionWithReference('PPP-222-22B')

      expect((await loadConfirmation(first)).result).toEqual(
        expect.stringContaining('PPP-111-11A')
      )
      expect((await loadConfirmation(second)).result).toEqual(
        expect.stringContaining('PPP-222-22B')
      )
    })

    test('Should fail rather than invent a reference when the session has none', async () => {
      const { statusCode } = await loadConfirmation()

      expect(statusCode).toBe(statusCodes.badData)
    })
  })
})
