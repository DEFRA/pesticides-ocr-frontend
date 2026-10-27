import { vi } from 'vitest'
import { load } from 'cheerio'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getSessionCookie } from '#/test-helpers/session-helpers.js'
import { completeJourney } from '#/test-helpers/journey-helpers.js'
import {
  getCurrentEmailVerification,
  requestEmailVerification
} from '#/server/common/helpers/email-verification-client.js'
import { backendError } from '#/server/common/helpers/ocr-backend-client.js'
import {
  applicantError,
  currentVerification,
  linkSent,
  mockEmailVerification
} from '#/test-helpers/email-verification-helpers.js'

vi.mock(import('#/server/common/helpers/email-verification-client.js'))

describe('#checkYourEmailController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    mockEmailVerification({ status: 'pending' })
  })

  const contact = {
    contactName: 'Jo Bloggs',
    contactTelephone: '01234 567890',
    contactEmail: 'jo@example.com'
  }

  const visit = (cookie, url = '/check-your-email') =>
    server.inject({ method: 'GET', url, headers: { cookie } })

  const post = (cookie, url, payload) =>
    server.inject({ method: 'POST', url, headers: { cookie }, payload })

  const enterEmail = async (url = '/business-contact') => {
    const cookie = await getSessionCookie(server, '/business-contact')
    await post(cookie, url, contact)
    return cookie
  }

  const confirmed = async () => {
    const cookie = await enterEmail()
    vi.mocked(getCurrentEmailVerification).mockResolvedValueOnce(currentVerification('verified'))
    await post(cookie, '/check-your-email')
    return cookie
  }

  const errorSummaryOf = (html) => load(html)('.govuk-error-summary__list').text().trim()

  describe('GET /check-your-email', () => {
    test('Should show where the link was sent, when it expires and how to change the address', async () => {
      const cookie = await enterEmail()

      const { result, statusCode, headers } = await visit(cookie)
      const page = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect(headers['cache-control']).toBe('no-store')
      expect(result).toEqual(expect.stringContaining('Check your email |'))
      expect(page('h1').text()).toBe('Check your email')
      expect(page('main strong').text()).toBe('jo@example.com')
      expect(result).toEqual(expect.stringContaining('The link will expire in 15 minutes.'))
      expect(page('a.govuk-link[href="/business-contact"]').text()).toBe('Change email address')
      expect(page('.govuk-back-link').attr('href')).toBe('/business-contact')
    })

    test('Should offer another email inside "Not received an email?"', async () => {
      const cookie = await enterEmail()

      const page = load((await visit(cookie)).result)
      const details = page('details.govuk-details')

      expect(details.find('.govuk-details__summary-text').text().trim()).toBe('Not received an email?')
      expect(details.attr('open')).toBeUndefined()
      expect(details.text()).toEqual(expect.stringContaining('check your spam or junk folder'))
      expect(details.find('form').attr('action')).toBe('/check-your-email/resend')
      expect(details.find('form').attr('method')).toBe('post')
      expect(details.find('button').text().trim()).toBe('Request another email')
    })

    test('Should explain what to do when the link is opened on a different device', async () => {
      const cookie = await enterEmail()

      const page = load((await visit(cookie)).result)
      const continueForm = page('main form').last()

      expect(page('main').text()).toEqual(
        expect.stringContaining('If you open the link on a different device, come back to this page and select Continue.')
      )
      expect(continueForm.attr('action')).toBe('/check-your-email')
      expect(continueForm.find('button').text().trim()).toBe('Continue')
    })

    test('Should keep change mode in every link and form', async () => {
      const cookie = await enterEmail('/business-contact?change=true')

      const page = load((await visit(cookie, '/check-your-email?change=true')).result)

      expect(page('a.govuk-link[href="/business-contact?change=true"]').text()).toBe('Change email address')
      expect(page('main form').map((_index, form) => form.attribs.action).get()).toEqual([
        '/check-your-email/resend?change=true',
        '/check-your-email?change=true'
      ])
    })

    test('Should say when the link has expired and open the resend section', async () => {
      vi.mocked(requestEmailVerification).mockResolvedValueOnce(linkSent({ expiresInMinutes: -1 }))
      const cookie = await enterEmail()

      const { result } = await visit(cookie)
      const page = load(result)

      expect(result).toEqual(expect.stringContaining('The link has expired. Request another email to get a new link.'))
      expect(result).not.toEqual(expect.stringContaining('The link will expire'))
      expect(page('details.govuk-details').attr('open')).toBeDefined()
    })

    test('Should ask for the email address when no link has been sent', async () => {
      const cookie = await getSessionCookie(server, '/business-contact')

      const { statusCode, headers } = await visit(cookie)

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/business-contact')
    })
  })

  describe('POST /check-your-email', () => {
    test('Should continue the journey once the address is confirmed on another device', async () => {
      const cookie = await enterEmail()
      vi.mocked(getCurrentEmailVerification).mockResolvedValueOnce(currentVerification('verified'))

      const { statusCode, headers } = await post(cookie, '/check-your-email')

      expect(getCurrentEmailVerification).toHaveBeenCalledTimes(1)
      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/business-name')
    })

    test('Should return to check answers after the address is changed from there', async () => {
      mockEmailVerification({ status: 'verified' })
      const cookie = await completeJourney(server)

      const changed = await post(cookie, '/business-contact?change=true', { ...contact, contactEmail: 'jane@example.com' })
      const { headers } = await post(cookie, '/check-your-email?change=true')

      expect(changed.headers.location).toBe('/check-your-email?change=true')
      expect(headers.location).toBe('/check-answers')
    })

    test('Should not ask the backend again once the address is confirmed', async () => {
      const cookie = await confirmed()

      const { headers } = await post(cookie, '/check-your-email')

      expect(getCurrentEmailVerification).toHaveBeenCalledTimes(1)
      expect(headers.location).toBe('/business-name')
    })

    test.each([
      ['pending', 'Confirm your email address using the link in the email we sent you', false],
      ['expired', 'The link has expired. Request another email to get a new link.', true],
      ['none', 'Request another email to get a link to confirm your email address', true]
    ])('Should stay on the page with an error when the link is %s', async (status, message, opensResend) => {
      const cookie = await enterEmail()
      vi.mocked(getCurrentEmailVerification).mockResolvedValueOnce(currentVerification(status))

      const { result, statusCode } = await post(cookie, '/check-your-email')
      const page = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect(errorSummaryOf(result)).toBe(message)
      expect(page('details.govuk-details').attr('open') !== undefined).toBe(opensResend)
      expect((await visit(cookie, '/business-name')).headers.location).toBe('/check-your-email')
    })

    test('Should show the error page for an unknown status', async () => {
      const cookie = await enterEmail()
      vi.mocked(getCurrentEmailVerification).mockResolvedValueOnce({ status: 'unexpected' })

      const { statusCode } = await post(cookie, '/check-your-email')

      expect(statusCode).toBe(statusCodes.badGateway)
    })

    test('Should return the next page as JSON for the auto-chained progressive-enhancement call', async () => {
      const cookie = await enterEmail()
      vi.mocked(getCurrentEmailVerification).mockResolvedValueOnce(currentVerification('verified'))

      const response = await server.inject({
        method: 'POST',
        url: '/check-your-email',
        headers: { cookie, accept: 'application/json' }
      })

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.result).toEqual({ redirectTo: '/business-name' })
    })

    test('Should show the error page when the backend rejects the journey token', async () => {
      const cookie = await enterEmail()
      vi.mocked(getCurrentEmailVerification).mockRejectedValueOnce(
        backendError(statusCodes.badGateway, 'OCR backend email verification status returned 401 JOURNEY_TOKEN_INVALID')
      )

      const { result, statusCode } = await post(cookie, '/check-your-email')

      expect(statusCode).toBe(statusCodes.badGateway)
      expect(result).toEqual(expect.stringContaining('Something went wrong'))
    })

    test('Should ask for the email address when no link has been sent', async () => {
      const cookie = await getSessionCookie(server, '/business-contact')

      const { headers } = await post(cookie, '/check-your-email')

      expect(headers.location).toBe('/business-contact')
      expect(getCurrentEmailVerification).not.toHaveBeenCalled()
    })
  })

  describe('POST /check-your-email/resend', () => {
    test('Should send another email and confirm it was sent, once', async () => {
      const cookie = await enterEmail()

      const { statusCode, headers } = await post(cookie, '/check-your-email/resend')
      const first = await visit(cookie)
      const second = await visit(cookie)

      expect(requestEmailVerification).toHaveBeenCalledTimes(2)
      expect(requestEmailVerification).toHaveBeenLastCalledWith(expect.anything(), 'jo@example.com')
      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/check-your-email')
      expect(load(first.result)('.govuk-notification-banner--success').text()).toEqual(
        expect.stringContaining('We have sent another email to jo@example.com')
      )
      expect(load(second.result)('.govuk-notification-banner')).toHaveLength(0)
    })

    test('Should need the new link to be confirmed after a resend', async () => {
      const cookie = await confirmed()

      await post(cookie, '/check-your-email/resend')

      expect((await visit(cookie, '/business-name')).headers.location).toBe('/check-your-email')
    })

    test.each([
      [applicantError('RESEND_COOLDOWN', 42), 'Wait 42 seconds before requesting another email'],
      [applicantError('RATE_LIMITED', 3600), 'You have requested too many emails. Try again in 60 minutes.'],
      [applicantError('EMAIL_SEND_FAILED'), 'We could not send the email. Check the address is correct and try again.']
    ])('Should show the error for %o on the page', async (error, message) => {
      const cookie = await enterEmail()
      vi.mocked(requestEmailVerification).mockResolvedValueOnce(error)

      const { result, statusCode } = await post(cookie, '/check-your-email/resend')

      expect(statusCode).toBe(statusCodes.ok)
      expect(errorSummaryOf(result)).toBe(message)
      expect(load(result)('main form').first().attr('action')).toBe('/check-your-email/resend')
      expect(load(result)('main form').last().attr('action')).toBe('/check-your-email')
    })

    test('Should show the error page when email verification is not configured', async () => {
      const cookie = await enterEmail()
      vi.mocked(requestEmailVerification).mockRejectedValueOnce(
        backendError(statusCodes.serviceUnavailable, 'OCR backend email verification request returned 503 SERVICE_NOT_CONFIGURED')
      )

      const { statusCode } = await post(cookie, '/check-your-email/resend')

      expect(statusCode).toBe(statusCodes.serviceUnavailable)
    })
  })

  describe('Pages after the email address', () => {
    test('Should wait for the email address to be confirmed', async () => {
      const cookie = await enterEmail()

      const pages = await Promise.all(
        ['/business-name', '/business-address', '/business-activities', '/address-activity', '/quantity', '/member-schemes', '/additional-addresses/address'].map((url) => visit(cookie, url))
      )

      pages.forEach(({ statusCode, headers }) => {
        expect(statusCode).toBe(statusCodes.redirect)
        expect(headers.location).toBe('/check-your-email')
      })
    })

    test('Should return to check answers once the address is confirmed', async () => {
      const cookie = await enterEmail()

      const answers = await visit(cookie, '/check-answers')
      const submit = await post(cookie, '/check-answers')

      expect(answers.headers.location).toBe('/check-your-email?change=true')
      expect(submit.headers.location).toBe('/check-your-email?change=true')
    })

    test('Should let the journey continue once the address is confirmed', async () => {
      const cookie = await confirmed()

      const { statusCode } = await visit(cookie, '/business-name')

      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should not wait when no email address has been entered', async () => {
      const cookie = await getSessionCookie(server, '/business-name')

      const { statusCode } = await visit(cookie, '/business-name')

      expect(statusCode).toBe(statusCodes.ok)
    })
  })
})
