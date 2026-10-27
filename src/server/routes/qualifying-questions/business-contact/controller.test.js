import { vi } from 'vitest'
import { createServer } from '#/server/server.js'
import { load } from 'cheerio'
import { answerStep, revisitStep } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getSessionCookie, injectWithSession } from '#/test-helpers/session-helpers.js'
import { requestEmailVerification } from '#/server/common/helpers/email-verification-client.js'
import { backendError } from '#/server/common/helpers/ocr-backend-client.js'
import {
  applicantError,
  linkSent,
  mockEmailVerification
} from '#/test-helpers/email-verification-helpers.js'

vi.mock(import('#/server/common/helpers/email-verification-client.js'))

describe('#businessContactController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    mockEmailVerification()
  })

  describe('GET /business-contact', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/business-contact'
      })

      expect(result).toEqual(expect.stringContaining('Who should we contact about your PPP activities? |'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('POST /business-contact', () => {
    const contact = {
      contactName: 'John Smith',
      contactTelephone: '01234 567890',
      contactEmail: 'John.Smith@pesticides.co.uk'
    }

    const submit = (cookie, payload = contact, url = '/business-contact') =>
      server.inject({ method: 'POST', url, payload, headers: { cookie } })

    const newSession = () => getSessionCookie(server, '/business-contact')

    test('Should send a link to the email address and ask the user to check their email', async () => {
      const { statusCode, headers } = await injectWithSession(server, {
        method: 'POST',
        url: '/business-contact',
        payload: contact
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/check-your-email')
      expect(requestEmailVerification).toHaveBeenCalledTimes(1)
      expect(requestEmailVerification).toHaveBeenCalledWith(expect.anything(), 'John.Smith@pesticides.co.uk')
    })

    test('Should keep change mode on the way to check your email', async () => {
      const { headers } = await submit(await newSession(), contact, '/business-contact?change=true')

      expect(headers.location).toBe('/check-your-email?change=true')
    })

    test('Should not send another link when the same address is entered again before it expires', async () => {
      const cookie = await newSession()

      await submit(cookie)
      const { headers } = await submit(cookie, { ...contact, contactEmail: 'john.smith@PESTICIDES.co.uk' })

      expect(headers.location).toBe('/check-your-email')
      expect(requestEmailVerification).toHaveBeenCalledTimes(1)
    })

    test('Should send a new link when the earlier one has expired', async () => {
      vi.mocked(requestEmailVerification).mockResolvedValueOnce(linkSent({ expiresInMinutes: -1 }))
      const cookie = await newSession()

      await submit(cookie)
      await submit(cookie)

      expect(requestEmailVerification).toHaveBeenCalledTimes(2)
    })

    test('Should continue the journey when the address was already confirmed', async () => {
      const cookie = await newSession()
      await submit(cookie)
      await submit(cookie, {}, '/check-your-email')

      const { headers } = await submit(cookie, { ...contact, contactTelephone: '09876 543210' })

      expect(headers.location).toBe('/business-name')
      expect(requestEmailVerification).toHaveBeenCalledTimes(1)
    })

    test('Should clear the confirmation and send a new link when the address changes', async () => {
      const cookie = await newSession()
      await submit(cookie)
      await submit(cookie, {}, '/check-your-email')

      const changed = await submit(cookie, { ...contact, contactEmail: 'jane@example.com' })
      const nextPage = await server.inject({ method: 'GET', url: '/address-activity', headers: { cookie } })

      expect(changed.headers.location).toBe('/check-your-email')
      expect(requestEmailVerification).toHaveBeenLastCalledWith(expect.anything(), 'jane@example.com')
      expect(nextPage.headers.location).toBe('/check-your-email')
    })

    test.each([
      [applicantError('VALIDATION_ERROR'), 'Enter an email address in the correct format, like name@example.com'],
      [applicantError('RESEND_COOLDOWN', 42), 'Wait 42 seconds before requesting another email'],
      [applicantError('RATE_LIMITED', 1800), 'You have requested too many emails. Try again in 30 minutes.'],
      [applicantError('EMAIL_SEND_FAILED'), 'We could not send the email. Check the address is correct and try again.']
    ])('Should show the email error for %o on the page', async (result, message) => {
      vi.mocked(requestEmailVerification).mockResolvedValueOnce(result)

      const { result: html, statusCode } = await submit(await newSession())
      const page = load(html)

      expect(statusCode).toBe(statusCodes.ok)
      expect(page('.govuk-error-summary a[href="#contactEmail"]').text()).toBe(message)
      expect(page('#contactEmail-error').text()).toEqual(expect.stringContaining(message))
      expect(page('#contactEmail').val()).toBe(contact.contactEmail)
    })

    test.each([statusCodes.serviceUnavailable, statusCodes.badGateway])(
      'Should show the error page when the backend fails with %i',
      async (status) => {
        vi.mocked(requestEmailVerification).mockRejectedValueOnce(backendError(status, 'OCR backend failed'))

        const { result, statusCode } = await submit(await newSession())

        expect(statusCode).toBe(status)
        expect(result).toEqual(expect.stringContaining('Something went wrong'))
      }
    )

    test('Should return view with error message', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/business-contact',
        payload: {
          contactName: '',
          contactTelephone: '',
          contactEmail: ''
        }
      })

      expect(result).toEqual(expect.stringContaining('Enter a contact name'))
      expect(statusCode).toBe(statusCodes.ok)
      expect(requestEmailVerification).not.toHaveBeenCalled()
    })
  })

  describe('Pre-populating from the session', () => {
    const url = '/business-contact'

    const contact = {
      contactName: 'Jo Bloggs',
      contactTelephone: '01234 567890',
      contactEmail: 'jo@example.com'
    }

    test('Should populate the contact details held in the session', async () => {
      const cookie = await answerStep(server, { url, payload: contact })

      const page = await revisitStep(server, { url, cookie })

      Object.entries(contact).forEach(([field, value]) => {
        expect(page(`#${field}`).val()).toBe(value)
      })
    })

    test('Should render the contact details empty when none are held in the session', async () => {
      const page = await revisitStep(server, { url })

      Object.keys(contact).forEach((field) => {
        expect(page(`#${field}`).val()).toBeFalsy()
      })
    })

    test('Should validate an amended value and show it rather than the session value', async () => {
      const cookie = await answerStep(server, { url, payload: contact })

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url,
        payload: { ...contact, contactEmail: 'not-an-email' },
        headers: { cookie }
      })
      const page = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Enter a valid email address'))
      expect(page('#contactEmail').val()).toBe('not-an-email')
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })
})
