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

    test('Should say where the verification link was sent and when it expires', async () => {
      const cookie = await answerContact()

      const page = await revisitStep(server, { url, cookie })

      expect(page('h1').text().trim()).toBe('Check your email')
      expect(page('main strong').text().trim()).toBe('jo@example.com')
      expect(page('main').text()).toEqual(
        expect.stringContaining('containing a verification link.')
      )
      expect(page('main').text()).toEqual(expect.stringContaining('The link expires in 15 minutes.'))
    })

    test('Should explain what to do when the email has not arrived', async () => {
      const cookie = await answerContact()

      const page = await revisitStep(server, { url, cookie })
      const details = page('.govuk-details')

      expect(details.find('.govuk-details__summary-text').text().trim()).toBe('Not received an email?')
      expect(
        details
          .find('li')
          .map((_index, item) => page(item).text().trim())
          .get()
      ).toEqual(['check your spam or junk folder', 'check that the email address shown is correct'])
      expect(details.find('a').text().trim()).toBe('request a new verification link')
      expect(details.find('a').attr('href')).toBe(url)
    })

    test('Should offer a temporary button to carry on to the business name', async () => {
      const cookie = await answerContact()

      const page = await revisitStep(server, { url, cookie })
      const button = page('a.govuk-button')

      expect(button.text().trim()).toBe('I have already verified')
      expect(button.attr('href')).toBe('/business-name')
      expect(button.hasClass('govuk-button--secondary')).toBe(true)
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

  test('Should be where the business contact page goes, even when changing an answer', async () => {
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

    expect(headers.location).toBe(url)
  })
})
