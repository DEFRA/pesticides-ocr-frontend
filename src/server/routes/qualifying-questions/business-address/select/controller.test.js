import { load } from 'cheerio'

import { createServer } from '#/server/server.js'
import { answerStep, completeJourney, revisitStep } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { findAddresses } from '#/server/common/helpers/address-lookup.js'

// Uses the stub lookup unless a test says otherwise.
vi.mock('#/server/common/helpers/address-lookup.js', async (importOriginal) => {
  const actual = await importOriginal()

  return { findAddresses: vi.fn(actual.findAddresses) }
})

describe('#businessAddressSelectController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const url = '/business-address/select'

  const searchFor = (payload, cookie) =>
    answerStep(server, { url: '/business-address', payload, cookie })

  const choose = (cookie, address, path = url) =>
    server.inject({ method: 'POST', url: path, headers: { cookie }, payload: { address } })

  const addressOptions = (page) =>
    page('select#address option')
      .map((_index, option) => ({ value: page(option).val(), text: page(option).text().trim() }))
      .get()

  const selectedAddress = (page) => page('select#address option:selected').val()

  describe('GET /business-address/select', () => {
    test('Should return view', async () => {
      const cookie = await searchFor({ addressPostcode: 'AA3 1AB' })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url,
        headers: { cookie }
      })

      expect(result).toEqual(expect.stringContaining('Select Address |'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should list the addresses found in a dropdown, each on one line', async () => {
      const cookie = await searchFor({ addressPostcode: 'aa31ab' })

      const page = await revisitStep(server, { url, cookie })

      expect(page('h1').text()).toBe('What is the main address for your business or organisation?')
      expect(page('label[for="address"]').text().trim()).toBe('Select an address')
      expect(addressOptions(page)).toEqual([
        { value: '', text: '4 addresses found' },
        { value: '0', text: 'Lower Meadow Barn, Mill Lane, Farm town, Farmshire, AA3 1AB, England' },
        { value: '1', text: 'Highfield Farm, Mill Lane, Farm town, Farmshire, AA3 1AB, England' },
        { value: '2', text: '1 Mill Lane, Farm town, AA3 1AB, England' },
        { value: '3', text: '2 Mill Lane, Farm town, AA3 1AB, England' }
      ])
      expect(page('#address-hint')).toHaveLength(0)
      expect(page('button[type="submit"]').text().trim()).toBe('Continue')
    })

    test('Should ask to confirm the address when the building narrows it down to one', async () => {
      const cookie = await searchFor({
        addressPostcode: 'AA3 1AB',
        addressBuilding: 'Lower Meadow Barn'
      })

      const page = await revisitStep(server, { url, cookie })

      expect(page('select')).toHaveLength(0)
      expect(page('button[type="submit"]').text().trim()).toBe('Use this address')
    })

    test('Should not show a search summary above the dropdown', async () => {
      const cookie = await searchFor({ addressPostcode: 'AA3 1AB' })

      const page = await revisitStep(server, { url, cookie })

      expect(page('#address-search-summary')).toHaveLength(0)
    })

    test('Should say when no address was found and offer to search again', async () => {
      const cookie = await searchFor({ addressPostcode: 'AA3 1AB', addressBuilding: 'Nowhere' })

      const { result } = await server.inject({ method: 'GET', url, headers: { cookie } })
      const page = await revisitStep(server, { url, cookie })

      expect(result).toEqual(expect.stringContaining('No Address Found |'))
      expect(page('h1').text()).toBe('No address found')
      expect(page('#address-search-summary').text().replaceAll(/\s+/g, ' ').trim()).toBe(
        'We could not find an address for Nowhere and AA3 1AB.'
      )
      expect(page('a:contains("Search again")').attr('href')).toBe('/business-address')
      expect(page('select[name="address"]')).toHaveLength(0)
      expect(page('main').text()).not.toEqual(expect.stringContaining('manually'))
    })

    test('Should escape the building that was searched for', async () => {
      const cookie = await searchFor({ addressPostcode: 'AA3 1AB', addressBuilding: '<b>Nowhere</b>' })

      const { result } = await server.inject({ method: 'GET', url, headers: { cookie } })

      expect(result).toEqual(expect.stringContaining('&lt;b&gt;Nowhere&lt;/b&gt;'))
    })

    test('Should send someone who has not searched to the search', async () => {
      const { statusCode, headers } = await server.inject({ method: 'GET', url })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/business-address')
    })

    test('Should keep change mode when sending someone to the search', async () => {
      const { headers } = await server.inject({ method: 'GET', url: `${url}?change=true` })

      expect(headers.location).toBe('/business-address?change=true')
    })

    test('Should link back to the search', async () => {
      const cookie = await searchFor({ addressPostcode: 'AA3 1AB' })

      const page = await revisitStep(server, { url, cookie })

      expect(page('.govuk-back-link').attr('href')).toBe('/business-address')
    })

    test('Should link back to the search in change mode', async () => {
      const cookie = await completeJourney(server)
      await searchFor({ addressPostcode: 'AA3 1AB' }, cookie)

      const page = await revisitStep(server, { url: `${url}?change=true`, cookie })

      expect(page('.govuk-back-link')).toHaveLength(1)
      expect(page('.govuk-back-link').attr('href')).toBe('/business-address?change=true')
    })

    test('Should tell the browser not to store the page', async () => {
      const cookie = await searchFor({ addressPostcode: 'AA3 1AB' })

      const { headers } = await server.inject({ method: 'GET', url, headers: { cookie } })

      expect(headers['cache-control']).toBe('no-store')
    })
  })

  describe('POST /business-address/select', () => {
    test('Should redirect to business contact page', async () => {
      const cookie = await searchFor({ addressPostcode: 'AA3 1AB' })

      const { statusCode, headers } = await choose(cookie, '1')

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/business-contact')
    })

    test('Should save the chosen address from the lookup', async () => {
      const cookie = await completeJourney(server)
      await searchFor({ addressPostcode: 'aa31ab' }, cookie)

      await choose(cookie, '1')

      const { result } = await server.inject({
        method: 'GET',
        url: '/check-answers',
        headers: { cookie }
      })
      expect(result).toEqual(
        expect.stringContaining('Highfield Farm<br>Mill Lane<br>Farm town<br>Farmshire<br>AA3 1AB')
      )
    })

    test('Should return to check answers in change mode', async () => {
      const cookie = await completeJourney(server)
      await searchFor({ addressPostcode: 'AA3 1AB' }, cookie)

      const { headers } = await choose(cookie, '2', `${url}?change=true`)

      expect(headers.location).toBe('/check-answers')
    })

    test.each([[''], ['abc'], ['-1']])('Should show an error for the value %o', async (address) => {
      const cookie = await searchFor({ addressPostcode: 'AA3 1AB' })

      const { result, statusCode } = await choose(cookie, address)

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('There is a problem'))
      expect(result).toEqual(expect.stringContaining('Select an address'))
      expect(result).toEqual(expect.stringContaining('href="#address"'))
      expect(result).toEqual(expect.stringContaining('2 Mill Lane, Farm town, AA3 1AB'))
    })

    test('Should show an error when nothing is selected', async () => {
      const cookie = await searchFor({ addressPostcode: 'AA3 1AB' })

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url,
        headers: { cookie },
        payload: {}
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Select an address'))
    })

    test('Should reject an address that is not in the results', async () => {
      const cookie = await searchFor({ addressPostcode: 'AA3 1AB' })

      const { result, statusCode } = await choose(cookie, '4')
      const page = await revisitStep(server, { url, cookie })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Select an address'))
      expect(selectedAddress(page)).toBe('')
    })

    test('Should send someone who has not searched to the search', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url,
        payload: { address: '0' }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/business-address')
    })

    test('Should send someone who has not searched to the search when nothing is selected', async () => {
      const { headers } = await server.inject({ method: 'POST', url, payload: {} })

      expect(headers.location).toBe('/business-address')
    })
  })

  describe('One address found', () => {
    const oneAddress = { addressPostcode: 'aa31ab', addressBuilding: 'Lower Meadow Barn' }

    const summaryText = (page) =>
      page('#address-search-summary').text().replaceAll(/\s+/g, ' ').trim()

    const insetLines = (page) =>
      page('#address-found')
        .html()
        .split('<br>')
        .map((line) => line.trim())

    test('Should return the confirmation view', async () => {
      const cookie = await searchFor(oneAddress)

      const { result, statusCode } = await server.inject({ method: 'GET', url, headers: { cookie } })
      const page = await revisitStep(server, { url, cookie })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Confirm Address |'))
      expect(page('h1').text()).toBe('What is the main address for your business or organisation?')
    })

    test('Should say what was searched for, postcode first, and offer to search again', async () => {
      const cookie = await searchFor(oneAddress)

      const page = await revisitStep(server, { url, cookie })

      expect(summaryText(page)).toBe(
        '1 address found for AA3 1AB and Lower Meadow Barn. Search again'
      )
      expect(page('#address-search-summary strong').map((_i, el) => page(el).text()).get()).toEqual(
        ['AA3 1AB', 'Lower Meadow Barn']
      )
      expect(page('#address-search-summary a').text()).toBe('Search again')
      expect(page('#address-search-summary a').attr('href')).toBe('/business-address')
    })

    test('Should leave the building out of the summary when none was searched for', async () => {
      // The stub finds several addresses for a postcode on its own, so a real
      // lookup is needed to find exactly one without a building.
      const cookie = await searchFor({ addressPostcode: 'aa31ab' })
      vi.mocked(findAddresses).mockResolvedValueOnce([
        { addressLine1: '1 Mill Lane', addressTown: 'Farm town', addressPostcode: 'AA3 1AB' }
      ])

      const page = await revisitStep(server, { url, cookie })

      expect(summaryText(page)).toBe('1 address found for AA3 1AB. Search again')
      expect(page('#address-search-summary strong').text()).toBe('AA3 1AB')
      expect(insetLines(page)).toEqual(['1 Mill Lane', 'Farm town', 'AA3 1AB'])
    })

    test('Should keep change mode on the search again link', async () => {
      const cookie = await completeJourney(server)
      await searchFor(oneAddress, cookie)

      const page = await revisitStep(server, { url: `${url}?change=true`, cookie })

      expect(page('a:contains("Search again")').attr('href')).toBe('/business-address?change=true')
    })

    test('Should show the address in inset text, one line per address line', async () => {
      const cookie = await searchFor(oneAddress)

      const page = await revisitStep(server, { url, cookie })

      expect(page('#address-found').hasClass('govuk-inset-text')).toBe(true)
      expect(insetLines(page)).toEqual([
        'Lower Meadow Barn',
        'Mill Lane',
        'Farm town',
        'Farmshire',
        'AA3 1AB',
        'England'
      ])
      expect(page('#address-found').text()).not.toEqual(expect.stringContaining(','))
    })

    test('Should offer one button and no dropdown', async () => {
      const cookie = await searchFor(oneAddress)

      const page = await revisitStep(server, { url, cookie })

      expect(page('button[type="submit"]').text().trim()).toBe('Use this address')
      expect(page('input[type="hidden"][name="address"]').val()).toBe('0')
      expect(page('form').attr('action')).toBe(url)
      expect(page('select')).toHaveLength(0)
      expect(page('main').text()).not.toEqual(expect.stringContaining('addresses found'))
    })

    test('Should offer to enter an address manually next to the button', async () => {
      const cookie = await searchFor(oneAddress)

      const page = await revisitStep(server, { url, cookie })
      const group = page('form .govuk-button-group')

      expect(group.find('button[type="submit"]').text().trim()).toBe('Use this address')
      expect(group.find('p').text().replaceAll(/\s+/g, ' ').trim()).toBe(
        'or enter an address manually'
      )
      expect(group.find('a').text().trim()).toBe('enter an address manually')
      expect(group.find('a').attr('href')).toBe('/business-address/manual')
    })

    test('Should keep change mode on the manual entry link', async () => {
      const cookie = await completeJourney(server)
      await searchFor(oneAddress, cookie)

      const page = await revisitStep(server, { url: `${url}?change=true`, cookie })

      expect(page('a:contains("enter an address manually")').attr('href')).toBe(
        '/business-address/manual?change=true'
      )
    })

    test('Should link back to the page before the search', async () => {
      const cookie = await completeJourney(server)
      await searchFor(oneAddress, cookie)

      const page = await revisitStep(server, { url, cookie })

      expect(page('.govuk-back-link').attr('href')).toBe('/business-name')
    })

    test('Should link back to check answers in change mode', async () => {
      const cookie = await completeJourney(server)
      await searchFor(oneAddress, cookie)

      const page = await revisitStep(server, { url: `${url}?change=true`, cookie })

      expect(page('.govuk-back-link')).toHaveLength(1)
      expect(page('.govuk-back-link').attr('href')).toBe('/check-answers')
    })

    test('Should escape the building that was searched for', async () => {
      // The stub matches no building with markup in it, so the lookup is faked.
      const cookie = await searchFor({ addressPostcode: 'AA3 1AB', addressBuilding: '<i>Barn</i>' })
      vi.mocked(findAddresses).mockResolvedValueOnce([
        { addressLine1: '<i>Barn</i>', addressTown: 'Farm town', addressPostcode: 'AA3 1AB' }
      ])

      const { result } = await server.inject({ method: 'GET', url, headers: { cookie } })

      expect(result).toEqual(
        expect.stringContaining('<strong>&lt;i&gt;Barn&lt;/i&gt;</strong>.')
      )
      expect(result).toEqual(expect.stringContaining('&lt;i&gt;Barn&lt;/i&gt;<br>Farm town'))
      expect(load(result)('main i')).toHaveLength(0)
    })

    test('Should save the address and continue to business contact', async () => {
      const cookie = await searchFor({ addressPostcode: 'AA3 1AB', addressBuilding: 'Highfield' })

      const { statusCode, headers } = await choose(cookie, '0')

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/business-contact')
    })

    test('Should save the single address found', async () => {
      const cookie = await completeJourney(server)
      await searchFor({ addressPostcode: 'aa31ab', addressBuilding: '1 Mill' }, cookie)

      await choose(cookie, '0')

      const { result } = await server.inject({ method: 'GET', url: '/check-answers', headers: { cookie } })
      expect(result).toEqual(expect.stringContaining('1 Mill Lane<br>Farm town<br>AA3 1AB'))
    })

    test('Should return to check answers in change mode', async () => {
      const cookie = await completeJourney(server)
      await searchFor(oneAddress, cookie)

      const { headers } = await choose(cookie, '0', `${url}?change=true`)

      expect(headers.location).toBe('/check-answers')
    })

    test.each([[''], ['1']])(
      'Should show the confirmation again with an error for the value %o',
      async (address) => {
        const cookie = await searchFor(oneAddress)

        const { result, statusCode } = await choose(cookie, address)
        const page = load(result)

        expect(statusCode).toBe(statusCodes.ok)
        expect(page('.govuk-error-summary').text()).toEqual(expect.stringContaining('Select an address'))
        expect(page('select')).toHaveLength(0)
        expect(page('button[type="submit"]').text().trim()).toBe('Use this address')
        expect(insetLines(page)[0]).toBe('Lower Meadow Barn')
      }
    )
  })

  describe('Pre-populating from the session', () => {
    test('Should select the address already chosen', async () => {
      const cookie = await searchFor({ addressPostcode: 'AA3 1AB' })
      await choose(cookie, '2')

      const page = await revisitStep(server, { url, cookie })

      expect(selectedAddress(page)).toBe('2')
    })

    test('Should select nothing when no address has been chosen', async () => {
      const cookie = await searchFor({ addressPostcode: 'AA3 1AB' })

      const page = await revisitStep(server, { url, cookie })

      expect(selectedAddress(page)).toBe('')
    })

    test('Should select nothing when the chosen address is not in a new search', async () => {
      const cookie = await searchFor({ addressPostcode: 'AA3 1AB' })
      await choose(cookie, '0')
      await searchFor({ addressPostcode: 'SW1A 1AA' }, cookie)

      const page = await revisitStep(server, { url, cookie })

      expect(selectedAddress(page)).toBe('')
    })
  })
})
