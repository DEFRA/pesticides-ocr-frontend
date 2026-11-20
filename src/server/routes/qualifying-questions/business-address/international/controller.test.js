import { createServer } from '#/server/server.js'
import {
  answerStep,
  completeJourney,
  MANUAL_BUSINESS_ADDRESS,
  revisitStep
} from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getSessionCookie } from '#/test-helpers/session-helpers.js'

const url = '/business-address/international'
const internationalAddress = 'Rue de la Paix 12\n\n  75002 Paris  \nFrance'

describe('#internationalAddressController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const post = (payload, cookie, query = '') =>
    server.inject({ method: 'POST', url: `${url}${query}`, payload, headers: { cookie } })

  describe('GET /business-address/international', () => {
    test('Should return view with its title', async () => {
      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('What Is Your Main Business Address |'))
    })

    test('Should ask for the address in a textarea under the heading', async () => {
      const page = await revisitStep(server, { url })

      expect(page('h1').text().trim()).toBe('What is your main business address?')
      expect(page('h1 + p').text().trim()).toBe(
        'If your main business address is outside Great Britain, enter the details below.'
      )
      expect(page('label[for="internationalAddress"]').text().trim()).toBe('Enter your business address')
      expect(page('textarea#internationalAddress').attr('rows')).toBe('6')
      expect(page('button[type="submit"]').text().trim()).toBe('Continue')
    })

    test('Should link back to the manual address page, keeping change mode', async () => {
      const page = await revisitStep(server, { url })
      const changing = await revisitStep(server, { url: `${url}?change=true` })

      expect(page('.govuk-back-link').attr('href')).toBe('/business-address/manual')
      expect(changing('.govuk-back-link').attr('href')).toBe('/business-address/manual?change=true')
    })

    test('Should be linked to from the manual address page', async () => {
      const page = await revisitStep(server, { url: '/business-address/manual' })

      expect(page(`a[href="${url}"]`).text().trim()).toBe(
        'Our main business address is outside of Great Britain'
      )
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })

  describe('POST /business-address/international', () => {
    test('Should go on to the business activities', async () => {
      const cookie = await getSessionCookie(server, url)

      const { statusCode, headers } = await post({ internationalAddress }, cookie)

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/business-activities')
    })

    test('Should fill the textarea with the saved address', async () => {
      const cookie = await answerStep(server, { url, payload: { internationalAddress } })

      const page = await revisitStep(server, { url, cookie })

      expect(page('textarea#internationalAddress').val()).toEqual(
        expect.stringContaining('Rue de la Paix 12')
      )
    })

    test.each([[''], ['   ']])('Should ask for the address when it is %o', async (value) => {
      const cookie = await getSessionCookie(server, url)

      const { result, statusCode } = await post({ internationalAddress: value }, cookie)

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Enter your main business address'))
    })

    test('Should not accept an address over 500 characters, keeping what was typed', async () => {
      const cookie = await getSessionCookie(server, url)
      const tooLong = 'a'.repeat(501)

      const { result, statusCode } = await post({ internationalAddress: tooLong }, cookie)

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Business address must be 500 characters or less')
      )
      expect(result).toEqual(expect.stringContaining(tooLong))
    })

    test('Should replace an address in Great Britain, and be replaced by one', async () => {
      const cookie = await answerStep(server, {
        url: '/business-address/manual',
        payload: MANUAL_BUSINESS_ADDRESS
      })
      await post({ internationalAddress }, cookie)

      const manual = await revisitStep(server, { url: '/business-address/manual', cookie })

      expect(manual('#addressLine1').val()).toBeFalsy()

      await answerStep(server, { url: '/business-address/manual', payload: MANUAL_BUSINESS_ADDRESS, cookie })

      const international = await revisitStep(server, { url, cookie })

      expect(international('textarea#internationalAddress').val()).toBeFalsy()
    })
  })

  describe('On check answers', () => {
    const answersFor = async (cookie) => {
      const page = await revisitStep(server, { url: '/check-answers', cookie })

      return page('.govuk-summary-list__row').filter(
        (_index, row) => page(row).find('dt').text().trim() === 'Main address'
      )
    }

    test('Should show one line per line typed, linking back to this page', async () => {
      const cookie = await completeJourney(server)
      await post({ internationalAddress }, cookie, '?change=true')

      const row = await answersFor(cookie)

      expect(row.find('.govuk-summary-list__value').html()).toEqual(
        expect.stringMatching(/Rue de la Paix 12\s*<br>\s*75002 Paris\s*<br>\s*France/)
      )
      expect(row.find('a').attr('href')).toBe(`${url}?change=true`)
    })

    test('Should return to check answers when changing the address', async () => {
      const cookie = await completeJourney(server)

      const { headers } = await post({ internationalAddress }, cookie, '?change=true')

      expect(headers.location).toBe('/check-answers')
    })

    test('Should link a Great Britain address to the address search', async () => {
      const cookie = await completeJourney(server)

      const row = await answersFor(cookie)

      expect(row.find('a').attr('href')).toBe('/business-address?change=true')
    })
  })
})
