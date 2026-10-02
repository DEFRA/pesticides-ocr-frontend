import { vi } from 'vitest'

import { createServer } from '#/server/server.js'
import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  backendResponse,
  startEmailVerificationInSession,
  startedResponse,
  verifyEmailInSession
} from '#/test-helpers/email-verification-helpers.js'

describe('#emailAddressController', () => {
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

  const submitEmail = (email, cookie) =>
    server.inject({
      method: 'POST',
      url: '/email-address',
      ...(cookie ? { headers: { cookie } } : {}),
      payload: { email }
    })

  describe('GET /email-address', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/email-address'
      })

      expect(result).toEqual(expect.stringContaining('Email Address |'))
      expect(result).toEqual(
        expect.stringContaining('What is your email address?')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should show the email address already entered in this session', async () => {
      const cookie = await startEmailVerificationInSession(server)

      const { result } = await server.inject({
        method: 'GET',
        url: '/email-address',
        headers: { cookie }
      })

      expect(result).toEqual(
        expect.stringContaining('value="applicant@example.com"')
      )
    })
  })

  describe('POST /email-address', () => {
    test('Should send a code and redirect to the code page', async () => {
      const fetchSpy = stubBackend(startedResponse())

      const { statusCode, headers } = await submitEmail('applicant@example.com')

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/email-address/code')
      expect(JSON.parse(fetchSpy.mock.lastCall[1].body)).toEqual({
        email: 'applicant@example.com'
      })
    })

    test.each([
      ['', 'Enter an email address'],
      ['not-an-email', 'Enter an email address in the correct format'],
      ['£pplicant@example.com', 'Enter an email address in the correct format'],
      [`${'a'.repeat(250)}@example.com`, 'Email address must be 254 characters or fewer']
    ])('Should show an error for the email %j', async (email, message) => {
      const fetchSpy = stubBackend(startedResponse())

      const { result, statusCode } = await submitEmail(email)

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(message))
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    test('Should show an error when too many codes have been requested', async () => {
      stubBackend(backendResponse(statusCodes.tooManyRequests))

      const { result, statusCode } = await submitEmail('applicant@example.com')

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('You have asked for too many codes')
      )
    })

    test('Should show an error when the email could not be sent', async () => {
      stubBackend(backendResponse(statusCodes.badGateway))

      const { result, statusCode } = await submitEmail('applicant@example.com')

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('We could not send a code to this email address')
      )
    })

    test('Should show the backend message when the backend rejects the email', async () => {
      stubBackend(
        backendResponse(statusCodes.badRequest, {
          message: 'Enter a valid email address'
        })
      )

      const { result } = await submitEmail('applicant@example.com')

      expect(result).toEqual(
        expect.stringContaining('Enter a valid email address')
      )
    })

    test('Should show the error page for an unexpected backend response', async () => {
      stubBackend(backendResponse(statusCodes.internalServerError))

      const { statusCode } = await submitEmail('applicant@example.com')

      expect(statusCode).toBe(statusCodes.badGateway)
    })

    test('Should skip sending a code when the same email is already verified', async () => {
      const cookie = await verifyEmailInSession(server)
      const fetchSpy = stubBackend(startedResponse())

      const { statusCode, headers } = await submitEmail(
        'Applicant@Example.com',
        cookie
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/business-activities')
      expect(fetchSpy).not.toHaveBeenCalled()
    })

    test('Should send a new code when a different email is entered after verifying', async () => {
      const cookie = await verifyEmailInSession(server)
      const fetchSpy = stubBackend(
        startedResponse({ email: 'other@example.com' })
      )

      const { headers } = await submitEmail('other@example.com', cookie)

      expect(headers.location).toBe('/email-address/code')
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })
  })
})
