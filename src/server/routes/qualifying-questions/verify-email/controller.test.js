import { createServer } from '#/server/server.js'
import { answerStep, revisitStep } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

const url = '/verify-email'

describe('#verifyEmailController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const answerContact = () =>
    answerStep(server, {
      url: '/business-contact',
      payload: {
        contactName: 'Jo Bloggs',
        contactTelephone: '01234 567890',
        contactEmail: 'jo@example.com'
      }
    })

  describe('GET /verify-email', () => {
    test('Should send someone with no contact email back to the business contact page', async () => {
      const { statusCode, headers } = await server.inject({ method: 'GET', url })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/business-contact')
    })

    test('Should return view with its title', async () => {
      const cookie = await answerContact()

      const { result, statusCode } = await server.inject({ method: 'GET', url, headers: { cookie } })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Check Your Email |'))
    })

    test('Should say that no email has been sent while verification is not live', async () => {
      const cookie = await answerContact()

      const page = await revisitStep(server, { url, cookie })

      expect(page('h1').text().trim()).toBe('Check your email')
      expect(page('main strong').text().trim()).toBe('jo@example.com')
      expect(page('main p.govuk-body').text().replace(/\s+/g, ' ').trim()).toBe(
        "Email verification isn't live yet, so no email has been sent to jo@example.com."
      )
      expect(page('.govuk-details')).toHaveLength(0)
      expect(page('main a[href="/verify-email"]')).toHaveLength(0)
    })

    test('Should offer a temporary button to carry on to the business name', async () => {
      const cookie = await answerContact()

      const page = await revisitStep(server, { url, cookie })
      const button = page('a.govuk-button')

      expect(button.text().trim()).toBe('I have already verified')
      expect(button.attr('href')).toBe('/business-name')
      expect(button.hasClass('govuk-button--secondary')).toBe(true)
    })

    test('Should take the button and back link to check answers when changing an answer', async () => {
      const cookie = await answerContact()

      const page = await revisitStep(server, { url: `${url}?change=true`, cookie })

      expect(page('a.govuk-button').attr('href')).toBe('/check-answers')
      expect(page('.govuk-back-link').attr('href')).toBe('/check-answers')
    })

    test('Should link back to the business contact page', async () => {
      const cookie = await answerContact()

      const page = await revisitStep(server, { url, cookie })

      expect(page('.govuk-back-link').attr('href')).toBe('/business-contact')
    })

    test('Should be where the business name page links back to', async () => {
      const cookie = await answerContact()

      const page = await revisitStep(server, { url: '/business-name', cookie })

      expect(page('.govuk-back-link').attr('href')).toBe(url)
    })

    test('Should tell the browser not to store the page', async () => {
      const cookie = await answerContact()

      const { headers } = await server.inject({ method: 'GET', url, headers: { cookie } })

      expect(headers['cache-control']).toBe('no-store')
    })
  })

  test('Should be where the business contact page goes, keeping change mode', async () => {
    const cookie = await answerContact()

    const { headers } = await server.inject({
      method: 'POST',
      url: '/business-contact?change=true',
      headers: { cookie },
      payload: {
        contactName: 'Jo Bloggs',
        contactTelephone: '01234 567890',
        contactEmail: 'new@example.com'
      }
    })

    expect(headers.location).toBe(`${url}?change=true`)
  })
})
