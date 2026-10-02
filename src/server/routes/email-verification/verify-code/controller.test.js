import { vi } from 'vitest'

import { createServer } from '#/server/server.js'
import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  backendResponse,
  startEmailVerificationInSession,
  startedResponse,
  verificationId,
  verifyEmailInSession
} from '#/test-helpers/email-verification-helpers.js'

describe('#verifyCodeController', () => {
  let server
  let configuredBackendUrl

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    configuredBackendUrl = config.get('ocrBackend.url')
    config.set('ocrBackend.url', 'http://localhost:3001')
  })

  afterAll(async () => {
    config.set('ocrBackend.url', configuredBackendUrl)
    await server.stop({ timeout: 0 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const stubBackend = (response) =>
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)

  // A session in which a code has been sent but not yet confirmed.
  const pendingSession = (started) =>
    startEmailVerificationInSession(server, { started })

  const verifiedSession = () => verifyEmailInSession(server)

  const request = (method, url, cookie, payload) =>
    server.inject({
      method,
      url,
      ...(cookie ? { headers: { cookie } } : {}),
      ...(payload ? { payload } : {})
    })

  const loadCodePage = (cookie) => request('GET', '/email-address/code', cookie)
  const enterCode = (code, cookie) =>
    request('POST', '/email-address/code', cookie, { code })
  const resendCode = (cookie) => request('POST', '/email-address/resend', cookie)

  describe('GET /email-address/code', () => {
    test('Should show the email address the code was sent to', async () => {
      const cookie = await pendingSession()

      const { result, statusCode } = await loadCodePage(cookie)

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Check Your Email |'))
      expect(result).toEqual(
        expect.stringContaining('We have sent a code to <strong>applicant@example.com</strong>')
      )
      expect(result).toEqual(expect.stringContaining('The code is 6 digits'))
      expect(result).toEqual(expect.stringContaining('The code expires in 5 minutes'))
    })

    test('Should say when the code has expired', async () => {
      const cookie = await pendingSession(
        startedResponse({ expiresAt: new Date(Date.now() - 1000).toISOString() })
      )

      const { result } = await loadCodePage(cookie)

      expect(result).toEqual(expect.stringContaining('The code has expired'))
    })

    test('Should redirect to the email page when no code has been sent', async () => {
      const { statusCode, headers } = await loadCodePage()

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/email-address')
    })

    test('Should redirect into the journey when the email is already verified', async () => {
      const cookie = await verifiedSession()

      const { headers } = await loadCodePage(cookie)

      expect(headers.location).toBe('/business-activities')
    })
  })

  describe('POST /email-address/code', () => {
    test('Should confirm the code and continue the journey', async () => {
      const cookie = await pendingSession()
      const fetchSpy = stubBackend(
        backendResponse(statusCodes.ok, { verified: true })
      )

      const { statusCode, headers } = await enterCode('123 456', cookie)

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/business-activities')
      const [url, options] = fetchSpy.mock.lastCall
      expect(url.toString()).toContain(
        `/email-verifications/${verificationId}/confirm`
      )
      expect(JSON.parse(options.body)).toEqual({ code: '123456' })
    })

    test.each([
      ['', 'Enter the code'],
      ['12a456', 'The code must only include numbers'],
      ['12345', 'The code must be 6 digits']
    ])('Should show an error for the code %j', async (code, message) => {
      const cookie = await pendingSession()
      const fetchSpy = stubBackend(backendResponse(statusCodes.ok))

      const { result, statusCode } = await enterCode(code, cookie)

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(message))
      expect(result).toEqual(expect.stringContaining('applicant@example.com'))
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    test('Should show how many attempts are left for an incorrect code', async () => {
      const cookie = await pendingSession()
      stubBackend(
        backendResponse(statusCodes.badRequest, { remainingAttempts: 4 })
      )

      const { result } = await enterCode('000000', cookie)

      expect(result).toEqual(
        expect.stringContaining('The code is incorrect. You have 4 attempts left.')
      )
    })

    test('Should ask for a new code when the last attempt was incorrect', async () => {
      const cookie = await pendingSession()
      stubBackend(
        backendResponse(statusCodes.badRequest, { remainingAttempts: 0 })
      )

      const { result } = await enterCode('000000', cookie)

      expect(result).toEqual(
        expect.stringContaining('The code is incorrect. Request a new code.')
      )
    })

    test('Should say when the code has expired', async () => {
      const cookie = await pendingSession()
      stubBackend(backendResponse(statusCodes.badRequest, { message: 'expired' }))

      const { result } = await enterCode('123456', cookie)

      expect(result).toEqual(
        expect.stringContaining('The code has expired. Request a new code.')
      )
    })

    test('Should say when too many incorrect codes have been entered', async () => {
      const cookie = await pendingSession()
      stubBackend(backendResponse(statusCodes.tooManyRequests))

      const { result } = await enterCode('123456', cookie)

      expect(result).toEqual(
        expect.stringContaining('You have entered an incorrect code too many times')
      )
    })

    test('Should start again when the verification no longer exists', async () => {
      const cookie = await pendingSession()
      stubBackend(backendResponse(statusCodes.notFound))

      const { headers } = await enterCode('123456', cookie)

      expect(headers.location).toBe('/email-address')
      const codePage = await loadCodePage(cookie)
      expect(codePage.headers.location).toBe('/email-address')
    })

    test('Should show the error page for an unexpected backend response', async () => {
      const cookie = await pendingSession()
      stubBackend(backendResponse(statusCodes.internalServerError))

      const { statusCode } = await enterCode('123456', cookie)

      expect(statusCode).toBe(statusCodes.badGateway)
    })

    test('Should redirect to the email page when no code has been sent', async () => {
      const { headers } = await enterCode('123456')

      expect(headers.location).toBe('/email-address')
    })
  })

  describe('POST /email-address/resend', () => {
    test('Should send a new code and say so once on the code page', async () => {
      const cookie = await pendingSession()
      const fetchSpy = stubBackend(startedResponse())

      const { statusCode, headers } = await resendCode(cookie)

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/email-address/code')
      expect(fetchSpy.mock.lastCall[0].toString()).toContain(
        `/email-verifications/${verificationId}/resend`
      )

      const first = await loadCodePage(cookie)
      expect(first.result).toEqual(
        expect.stringContaining('We have sent a new code to applicant@example.com')
      )
      const second = await loadCodePage(cookie)
      expect(second.result).not.toEqual(
        expect.stringContaining('We have sent a new code')
      )
    })

    test('Should say how long to wait during the resend cooldown', async () => {
      const cookie = await pendingSession()
      stubBackend(
        backendResponse(statusCodes.tooManyRequests, {
          retryAfter: new Date(Date.now() + 45000).toISOString()
        })
      )

      const { result, statusCode } = await resendCode(cookie)

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toMatch(/Wait 4[56] seconds before asking for a new code/)
      expect(result).toEqual(expect.stringContaining('href="#resend"'))
    })

    test('Should say when too many codes have been requested', async () => {
      const cookie = await pendingSession()
      stubBackend(backendResponse(statusCodes.tooManyRequests))

      const { result } = await resendCode(cookie)

      expect(result).toEqual(
        expect.stringContaining('You have asked for too many codes. Try again later.')
      )
    })

    test('Should say when the new code could not be sent', async () => {
      const cookie = await pendingSession()
      stubBackend(backendResponse(statusCodes.badGateway))

      const { result } = await resendCode(cookie)

      expect(result).toEqual(
        expect.stringContaining('We could not send a new code. Try again.')
      )
    })

    test('Should continue the journey when the backend says the email is already verified', async () => {
      const cookie = await pendingSession()
      stubBackend(backendResponse(statusCodes.conflict))

      const { headers } = await resendCode(cookie)

      expect(headers.location).toBe('/business-activities')
    })

    test('Should start again when the verification no longer exists', async () => {
      const cookie = await pendingSession()
      stubBackend(backendResponse(statusCodes.notFound))

      const { headers } = await resendCode(cookie)

      expect(headers.location).toBe('/email-address')
    })

    test('Should show the error page for an unexpected backend response', async () => {
      const cookie = await pendingSession()
      stubBackend(backendResponse(statusCodes.internalServerError))

      const { statusCode } = await resendCode(cookie)

      expect(statusCode).toBe(statusCodes.badGateway)
    })
  })
})
