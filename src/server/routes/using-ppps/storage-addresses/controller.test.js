import { createServer } from '#/server/server.js'
import { answerUpToStoring, completeJourney, revisitStep } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getSessionCookie } from '#/test-helpers/session-helpers.js'

const url = '/using-ppps/storage-addresses'
const searchUrl = '/using-ppps/own-storage-address'
const manualUrl = '/using-ppps/own-storage-address/manual'

const barnLane = {
  addressLine1: '1 Barn Lane',
  addressLine2: '',
  addressTown: 'York',
  addressPostcode: 'YO1 7HH',
  addressRegion: 'england'
}

const millRoad = {
  addressLine1: '2 Mill Road',
  addressLine2: '',
  addressTown: 'Leeds',
  addressPostcode: 'LS1 1AA',
  addressRegion: 'wales'
}

describe('#storageAddressesController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const post = (path, payload, cookie) =>
    server.inject({ method: 'POST', url: path, payload, headers: { cookie } })

  // Stores PPPs at own sites, at another address, with the given addresses
  // entered by hand.
  const withAddresses = async (addresses, { storing = ['own'] } = {}) => {
    const cookie = await answerUpToStoring(server)
    await post('/using-ppps/storing', { storing }, cookie)
    await post('/using-ppps/storage-location', { storageLocation: ['another-address'] }, cookie)

    for (const address of addresses) {
      await post(manualUrl, address, cookie)
    }

    return cookie
  }

  const cardsOf = (page) =>
    page('.govuk-summary-card')
      .map((_index, card) => ({
        title: page(card).find('.govuk-summary-card__title').text().trim(),
        site: page(card)
          .find('.govuk-summary-list__value')
          .html()
          .replace(/<br>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
      }))
      .get()

  describe('GET /using-ppps/storage-addresses', () => {
    test('Should send someone with no addresses yet to the address search', async () => {
      const cookie = await getSessionCookie(server, url)

      const { statusCode, headers } = await server.inject({ method: 'GET', url, headers: { cookie } })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(searchUrl)
    })

    test('Should be where storage location goes when another address is ticked', async () => {
      const cookie = await answerUpToStoring(server)
      await post('/using-ppps/storing', { storing: ['own'] }, cookie)

      const { headers } = await post(
        '/using-ppps/storage-location',
        { storageLocation: ['another-address'] },
        cookie
      )

      expect(headers.location).toBe(url)
    })

    test('Should return view with its title and heading', async () => {
      const cookie = await withAddresses([barnLane])

      const { result, statusCode } = await server.inject({ method: 'GET', url, headers: { cookie } })
      const page = await revisitStep(server, { url, cookie })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Additional Storage Addresses |'))
      expect(page('h1').text().trim()).toBe('Additional storage addresses')
    })

    test('Should show a numbered card per address, with its storage site', async () => {
      const cookie = await withAddresses([barnLane, millRoad])

      const page = await revisitStep(server, { url, cookie })

      expect(cardsOf(page)).toEqual([
        { title: 'Storage address 1', site: '1 Barn Lane York YO1 7HH England' },
        { title: 'Storage address 2', site: '2 Mill Road Leeds LS1 1AA Wales' }
      ])
      expect(page('.govuk-summary-list__key').first().text().trim()).toBe('Storage site')
    })

    test('Should link each Change to the manual address page for that address', async () => {
      const cookie = await withAddresses([barnLane, millRoad])

      const page = await revisitStep(server, { url, cookie })
      const changeLinks = page('.govuk-summary-list__actions a')
        .map((_index, link) => page(link).attr('href'))
        .get()

      expect(changeLinks).toEqual([`${manualUrl}?address=1`, `${manualUrl}?address=2`])
    })

    test('Should offer Remove on each card as a form button styled as a link', async () => {
      const cookie = await withAddresses([barnLane])

      const page = await revisitStep(server, { url, cookie })
      const remove = page('.govuk-summary-card__action form')

      expect(remove.attr('method')).toBe('post')
      expect(remove.attr('action')).toBe(`${url}/remove`)
      expect(remove.find('input[name="address"]').val()).toBe('1')
      expect(remove.find('button').hasClass('govuk-link')).toBe(true)
      expect(remove.find('button').text().replace(/\s+/g, ' ').trim()).toBe('Remove storage address 1')
    })

    test('Should ask whether to add another address', async () => {
      const cookie = await withAddresses([barnLane])

      const page = await revisitStep(server, { url, cookie })

      expect(page('legend').text().trim()).toBe('Do you want to add another address?')
      expect(
        page('input[name="addAnother"]')
          .map((_index, input) => page(input).next('label').text().trim())
          .get()
      ).toEqual(['Yes', 'No'])
    })

    test('Should link back to storage location', async () => {
      const cookie = await withAddresses([barnLane])

      const page = await revisitStep(server, { url, cookie })

      expect(page('.govuk-back-link').attr('href')).toBe('/using-ppps/storage-location')
    })

    test('Should tell the browser not to store the page', async () => {
      const cookie = await withAddresses([barnLane])

      const { headers } = await server.inject({ method: 'GET', url, headers: { cookie } })

      expect(headers['cache-control']).toBe('no-store')
    })
  })

  describe('POST /using-ppps/storage-addresses', () => {
    test('Should go to a blank address search for another address when Yes is chosen', async () => {
      const cookie = await withAddresses([barnLane])

      const { headers } = await post(url, { addAnother: 'yes' }, cookie)
      const search = await revisitStep(server, { url: searchUrl, cookie })

      expect(headers.location).toBe(searchUrl)
      expect(search('#addressPostcode').val()).toBeFalsy()
      expect(search('.govuk-back-link').attr('href')).toBe(url)
    })

    test('Should go on to the quantity when No is chosen', async () => {
      const cookie = await withAddresses([barnLane])

      const { headers } = await post(url, { addAnother: 'no' }, cookie)

      expect(headers.location).toBe('/using-ppps/quantity')
    })

    test('Should go on to the storage contact when a third party also stores the products', async () => {
      const cookie = await withAddresses([barnLane], { storing: ['own', 'third-party'] })

      const { headers } = await post(url, { addAnother: 'no' }, cookie)
      const contact = await revisitStep(server, {
        url: '/using-ppps/third-party-storage-contact',
        cookie
      })

      expect(headers.location).toBe('/using-ppps/third-party-storage-contact')
      expect(contact('.govuk-back-link').attr('href')).toBe(url)
    })

    test.each([[{}], [{ addAnother: 'maybe' }]])(
      'Should ask whether to add another address for %o, keeping the cards',
      async (payload) => {
        const cookie = await withAddresses([barnLane])

        const { result, statusCode } = await post(url, payload, cookie)

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toEqual(
          expect.stringContaining('Select yes if you want to add another address')
        )
        expect(result).toEqual(expect.stringContaining('Storage address 1'))
      }
    )
  })

  describe('Changing an address', () => {
    test('Should fill the manual address page with the address being changed', async () => {
      const cookie = await withAddresses([barnLane, millRoad])

      const page = await revisitStep(server, { url: `${manualUrl}?address=2`, cookie })

      expect(page('#addressLine1').val()).toBe('2 Mill Road')
      expect(page('.govuk-back-link').attr('href')).toBe(url)
    })

    test('Should replace that address and go back to the list', async () => {
      const cookie = await withAddresses([barnLane, millRoad])

      const { headers } = await post(
        `${manualUrl}?address=1`,
        { ...barnLane, addressLine1: '3 Barn Lane' },
        cookie
      )
      const page = await revisitStep(server, { url, cookie })

      expect(headers.location).toBe(url)
      expect(cardsOf(page).map(({ site }) => site)).toEqual([
        '3 Barn Lane York YO1 7HH England',
        '2 Mill Road Leeds LS1 1AA Wales'
      ])
    })

    test('Should go back to the list for an address that is no longer on it', async () => {
      const cookie = await withAddresses([barnLane])

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: `${manualUrl}?address=9`,
        headers: { cookie }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(url)
    })
  })

  describe('POST /using-ppps/storage-addresses/remove', () => {
    test('Should remove the address and renumber the rest', async () => {
      const cookie = await withAddresses([barnLane, millRoad])

      const { headers } = await post(`${url}/remove`, { address: '1' }, cookie)
      const page = await revisitStep(server, { url, cookie })

      expect(headers.location).toBe(url)
      expect(cardsOf(page)).toEqual([
        { title: 'Storage address 1', site: '2 Mill Road Leeds LS1 1AA Wales' }
      ])
    })

    test('Should go to the address search once the last address is removed', async () => {
      const cookie = await withAddresses([barnLane])

      const { headers } = await post(`${url}/remove`, { address: '1' }, cookie)

      expect(headers.location).toBe(searchUrl)
    })

    test.each([[{ address: '9' }], [{ address: 'one' }], [{}]])(
      'Should leave the list as it is for %o',
      async (payload) => {
        const cookie = await withAddresses([barnLane])

        const { headers } = await post(`${url}/remove`, payload, cookie)
        const page = await revisitStep(server, { url, cookie })

        expect(headers.location).toBe(url)
        expect(cardsOf(page)).toHaveLength(1)
      }
    )
  })

  describe('From check answers', () => {
    const changing = async () => {
      const cookie = await completeJourney(server)
      await post('/using-ppps/storing?change=true', { storing: ['own'] }, cookie)
      await post(
        '/using-ppps/storage-location?change=true',
        { storageLocation: ['another-address'] },
        cookie
      )
      await post(`${manualUrl}?change=true`, barnLane, cookie)
      await post(`${manualUrl}?change=true`, millRoad, cookie)

      return cookie
    }

    test('Should keep change mode on its links and return to check answers on No', async () => {
      const cookie = await changing()

      const page = await revisitStep(server, { url: `${url}?change=true`, cookie })
      const { headers } = await post(`${url}?change=true`, { addAnother: 'no' }, cookie)

      expect(page('.govuk-back-link').attr('href')).toBe('/check-answers')
      expect(page('.govuk-summary-card__action form').first().attr('action')).toBe(
        `${url}/remove?change=true`
      )
      expect(headers.location).toBe('/check-answers')
    })

    test('Should keep change mode when an address is removed', async () => {
      const cookie = await changing()

      const { headers } = await post(`${url}/remove?change=true`, { address: '1' }, cookie)

      expect(headers.location).toBe(`${url}?change=true`)
    })
  })
})
