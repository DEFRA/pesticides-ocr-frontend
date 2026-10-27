import { vi } from 'vitest'
import { load } from 'cheerio'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getSessionCookie } from '#/test-helpers/session-helpers.js'
import { verifyEmailToken } from '#/server/common/helpers/email-verification-client.js'
import { backendError } from '#/server/common/helpers/ocr-backend-client.js'
import { linkRejected, linkVerified, mockEmailVerification } from '#/test-helpers/email-verification-helpers.js'

vi.mock(import('#/server/common/helpers/email-verification-client.js'))

const TOKEN = 'dGhpcy1pcy1hLTQzLWNoYXJhY3Rlci10b2tlbl9fX18'

describe('#verifyEmailController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    vi.mocked(verifyEmailToken).mockReset()
    mockEmailVerification({ status: 'pending' })
  })

  const contact = {
    contactName: 'Jo Bloggs',
    contactTelephone: '01234 567890',
    contactEmail: 'jo@example.com'
  }

  const visit = (cookie, url = '/verify-email') => server.inject({ method: 'GET', url, headers: { cookie } })

  const post = (cookie, url = '/verify-email', payload) =>
    server.inject({ method: 'POST', url, headers: { cookie }, payload })

  // The browser where the applicant entered their email address.
  const journeyBrowser = async () => {
    const cookie = await getSessionCookie(server, '/business-contact')
    await post(cookie, '/business-contact', contact)
    return cookie
  }

  // Any other browser, such as a phone, or an email scanner.
  const otherBrowser = () => getSessionCookie(server, '/business-contact')

  const openLink = async (cookie) => {
    await visit(cookie, `/verify-email?token=${TOKEN}`)
    return cookie
  }

  const confirm = async (cookie, result) => {
    vi.mocked(verifyEmailToken).mockResolvedValueOnce(result)
    await post(cookie)
    return visit(cookie)
  }

  const pageOf = ({ result }) => {
    const page = load(result)
    return {
      heading: page('h1').text().trim(),
      text: page('main').text(),
      forms: page('main form')
        .map((_index, form) => ({
          action: form.attribs.action,
          method: form.attribs.method,
          button: page(form).find('button').text().trim()
        }))
        .get()
    }
  }

  describe('GET /verify-email?token=…', () => {
    test('Should move the token out of the address bar without using it up', async () => {
      const cookie = await otherBrowser()

      const { statusCode, headers } = await visit(cookie, `/verify-email?token=${TOKEN}`)

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/verify-email')
      expect(headers['referrer-policy']).toBe('no-referrer')
      expect(verifyEmailToken).not.toHaveBeenCalled()
    })

    test('Should keep the token for a browser with no session yet', async () => {
      const opened = await server.inject({ method: 'GET', url: `/verify-email?token=${TOKEN}` })
      const cookie = opened.headers['set-cookie'][0].split(';')[0]

      expect(pageOf(await visit(cookie)).heading).toBe('Confirm your email address')
      expect(verifyEmailToken).not.toHaveBeenCalled()
    })

    test('Should never use up the token however often the link is opened', async () => {
      const cookie = await openLink(await otherBrowser())

      await visit(cookie)
      await visit(cookie, `/verify-email?token=${TOKEN}`)
      await visit(cookie)

      expect(verifyEmailToken).not.toHaveBeenCalled()
    })
  })

  describe('GET /verify-email', () => {
    test('Should ask the applicant to confirm their email address', async () => {
      const cookie = await openLink(await otherBrowser())

      const response = await visit(cookie)
      const { heading, text, forms } = pageOf(response)

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.headers['cache-control']).toBe('no-store')
      expect(response.headers['referrer-policy']).toBe('no-referrer')
      expect(response.headers['strict-transport-security']).toEqual(expect.stringContaining('max-age=31536000'))
      expect(response.result).toEqual(expect.stringContaining('Confirm your email address |'))
      expect(response.result).not.toEqual(expect.stringContaining(TOKEN))
      expect(heading).toBe('Confirm your email address')
      expect(text).toEqual(expect.stringContaining('Select the button to confirm this is your email address.'))
      expect(forms).toEqual([{ action: '/verify-email', method: 'post', button: 'Confirm email address' }])
      expect(load(response.result)('.govuk-back-link')).toHaveLength(0)
      expect(load(response.result)('form[data-verify-email-ajax]')).toHaveLength(1)
    })

    test.each(['/verify-email', '/verify-email?token=', '/verify-email?token=a&token=b'])(
      'Should say the link is not valid for %s',
      async (url) => {
        const cookie = await otherBrowser()

        const response = await visit(cookie, url)
        const page = pageOf(response.statusCode === statusCodes.redirect ? await visit(cookie) : response)

        expect(page.heading).toBe('This link is not valid')
        expect(verifyEmailToken).not.toHaveBeenCalled()
      }
    )
  })

  describe('POST /verify-email', () => {
    test('Should send the token to the backend only when the applicant confirms', async () => {
      const cookie = await openLink(await journeyBrowser())
      vi.mocked(verifyEmailToken).mockResolvedValueOnce(linkVerified())

      const { statusCode, headers } = await post(cookie)

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/verify-email')
      expect(headers['referrer-policy']).toBe('no-referrer')
      expect(verifyEmailToken).toHaveBeenCalledTimes(1)
      expect(verifyEmailToken).toHaveBeenCalledWith(expect.objectContaining({ path: '/verify-email' }), TOKEN)
    })

    test('Should clear the token so it is only sent once', async () => {
      const cookie = await openLink(await journeyBrowser())
      vi.mocked(verifyEmailToken).mockResolvedValueOnce(linkVerified())

      await post(cookie)
      const again = await post(cookie)

      expect(again.headers.location).toBe('/verify-email')
      expect(verifyEmailToken).toHaveBeenCalledTimes(1)
    })

    test('Should show the error page and clear the token when the backend fails', async () => {
      const cookie = await openLink(await journeyBrowser())
      vi.mocked(verifyEmailToken).mockRejectedValueOnce(
        backendError(statusCodes.badGateway, 'OCR backend email verification returned 500 VERIFICATION_FAILED')
      )

      const failed = await post(cookie)
      const after = pageOf(await visit(cookie))

      expect(failed.statusCode).toBe(statusCodes.badGateway)
      expect(failed.result).toEqual(expect.stringContaining('Something went wrong'))
      expect(after.heading).toBe('This link is not valid')
    })

    test('Should not call the backend without a token', async () => {
      const cookie = await otherBrowser()

      const { headers } = await post(cookie)

      expect(headers.location).toBe('/verify-email')
      expect(verifyEmailToken).not.toHaveBeenCalled()
    })

    test('Should return the outcome as JSON for the progressive-enhancement script (Option 3)', async () => {
      const cookie = await openLink(await journeyBrowser())
      vi.mocked(verifyEmailToken).mockResolvedValueOnce(linkVerified({ sameJourney: true }))

      const response = await server.inject({
        method: 'POST',
        url: '/verify-email',
        headers: { cookie, accept: 'application/json' }
      })

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.result).toMatchObject({
        heading: 'Email address confirmed',
        action: { text: 'Continue', action: '/check-your-email' }
      })
      // The session-backed outcome is still recorded, so a plain reload
      // (non-JS fallback) shows the same result.
      expect(pageOf(await visit(cookie)).heading).toBe('Email address confirmed')
    })

    test('Should return the current outcome as JSON when posting without a token', async () => {
      const cookie = await otherBrowser()

      const response = await server.inject({
        method: 'POST',
        url: '/verify-email',
        headers: { cookie, accept: 'application/json' }
      })

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.result).toMatchObject({ heading: 'This link is not valid' })
      expect(verifyEmailToken).not.toHaveBeenCalled()
    })
  })

  describe('Outcomes', () => {
    test('Should confirm the address and continue the journey in the same browser', async () => {
      const cookie = await openLink(await journeyBrowser())

      const response = await confirm(cookie, linkVerified({ sameJourney: true }))
      const { heading, text, forms } = pageOf(response)
      const next = await post(cookie, forms[0].action)

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.result).toEqual(expect.stringContaining('Email address confirmed |'))
      expect(heading).toBe('Email address confirmed')
      expect(text).toEqual(expect.stringContaining('Your email address has been confirmed.'))
      expect(text).not.toEqual(expect.stringContaining('Go back to the browser'))
      expect(forms).toEqual([{ action: '/check-your-email', method: 'post', button: 'Continue' }])
      expect(next.headers.location).toBe('/business-name')
      expect((await visit(cookie, '/business-name')).statusCode).toBe(statusCodes.ok)
    })

    test('Should send the applicant back to the browser where they started', async () => {
      const cookie = await openLink(await otherBrowser())

      const { heading, text, forms } = pageOf(await confirm(cookie, linkVerified({ sameJourney: false })))

      expect(heading).toBe('Email address confirmed')
      expect(text).toEqual(expect.stringContaining('Go back to the browser where you started to continue.'))
      expect(forms).toEqual([])
    })

    test('Should not continue a journey the backend says is not this one', async () => {
      const cookie = await openLink(await journeyBrowser())

      const { text, forms } = pageOf(await confirm(cookie, linkVerified({ sameJourney: false })))

      expect(text).toEqual(expect.stringContaining('Go back to the browser where you started to continue.'))
      expect(forms).toEqual([])
      expect((await visit(cookie, '/address-activity')).headers.location).toBe('/check-your-email')
    })

    test('Should offer a new link for an expired link in the browser where the applicant started', async () => {
      const cookie = await openLink(await journeyBrowser())

      const { heading, text, forms } = pageOf(await confirm(cookie, linkRejected('TOKEN_EXPIRED')))

      expect(heading).toBe('This link has expired')
      expect(text).toEqual(expect.stringContaining('Links work for 15 minutes.'))
      expect(forms).toEqual([{ action: '/check-your-email/resend', method: 'post', button: 'Send a new link' }])
    })

    test('Should send the applicant back to their first browser for a new link', async () => {
      const cookie = await openLink(await otherBrowser())

      const { heading, text, forms } = pageOf(await confirm(cookie, linkRejected('TOKEN_EXPIRED')))

      expect(heading).toBe('This link has expired')
      expect(text).toEqual(expect.stringContaining('Go back to the browser where you started to request a new link.'))
      expect(forms).toEqual([])
    })

    test('Should say the link is not valid', async () => {
      const cookie = await openLink(await journeyBrowser())

      const { heading, text, forms } = pageOf(await confirm(cookie, linkRejected('TOKEN_INVALID')))

      expect(heading).toBe('This link is not valid')
      expect(text).toEqual(
        expect.stringContaining('Check you used the full link from the most recent email, or request a new one.')
      )
      expect(forms).toEqual([{ action: '/check-your-email/resend', method: 'post', button: 'Send a new link' }])
    })

    test('Should point to the most recent email for a replaced link', async () => {
      const cookie = await openLink(await journeyBrowser())

      const { heading, text, forms } = pageOf(await confirm(cookie, linkRejected('TOKEN_SUPERSEDED')))

      expect(heading).toBe('This link has been replaced by a newer one')
      expect(text).toEqual(expect.stringContaining('Use the link in the most recent email we sent you.'))
      expect(forms).toEqual([])
    })

    test('Should continue when the link was already used in the same journey', async () => {
      const cookie = await openLink(await journeyBrowser())

      const { heading, text, forms } = pageOf(
        await confirm(cookie, linkRejected('TOKEN_ALREADY_USED', { sameJourney: true }))
      )

      expect(heading).toBe('Email address already confirmed')
      expect(text).toEqual(expect.stringContaining('This email address has already been confirmed.'))
      expect(forms).toEqual([{ action: '/check-your-email', method: 'post', button: 'Continue' }])
      expect((await visit(cookie, '/business-name')).statusCode).toBe(statusCodes.ok)
    })

    test('Should send the applicant back to their first browser when the link was already used', async () => {
      const cookie = await openLink(await otherBrowser())

      const { heading, text, forms } = pageOf(
        await confirm(cookie, linkRejected('TOKEN_ALREADY_USED', { sameJourney: false }))
      )

      expect(heading).toBe('Email address already confirmed')
      expect(text).toEqual(expect.stringContaining('Go back to the browser where you started to continue.'))
      expect(forms).toEqual([])
    })

    test('Should keep showing the outcome on refresh without sending the token again', async () => {
      const cookie = await openLink(await journeyBrowser())
      await confirm(cookie, linkVerified())

      const { heading } = pageOf(await visit(cookie))

      expect(heading).toBe('Email address confirmed')
      expect(verifyEmailToken).toHaveBeenCalledTimes(1)
    })

    test('Should ask for confirmation again when a new link is opened', async () => {
      const cookie = await openLink(await journeyBrowser())
      await confirm(cookie, linkRejected('TOKEN_EXPIRED'))

      await openLink(cookie)

      expect(pageOf(await visit(cookie)).heading).toBe('Confirm your email address')
    })
  })
})
