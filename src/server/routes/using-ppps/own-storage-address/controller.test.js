import { createServer } from '#/server/server.js'
import { answerStep, revisitStep } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getSessionCookie } from '#/test-helpers/session-helpers.js'

const heading = 'What is the location where you store PPPs?'
const searchUrl = '/using-ppps/own-storage-address'
const selectUrl = '/using-ppps/own-storage-address/select'
const manualUrl = '/using-ppps/own-storage-address/manual'

describe('#ownStorageAddress', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const post = (url, payload, cookie) =>
    server.inject({ method: 'POST', url, payload, headers: { cookie } })

  const search = async (payload) => {
    const cookie = await getSessionCookie(server, searchUrl)
    await post(searchUrl, payload, cookie)

    return cookie
  }

  const checkAnswersText = async (cookie) =>
    (await revisitStep(server, { url: '/check-answers', cookie }))('main').text()

  describe('Search', () => {
    test('Should ask the question, as the title and heading', async () => {
      const { result } = await server.inject({ method: 'GET', url: searchUrl })
      const page = await revisitStep(server, { url: searchUrl })

      expect(result).toEqual(expect.stringContaining(`${heading} |`))
      expect(page('h1').text().trim()).toBe(heading)
      expect(page('label[for="addressPostcode"]').text().trim()).toBe('Postcode')
      expect(page('button[type="submit"]').text().trim()).toBe('Find an address')
    })

    test('Should offer to enter the address manually', async () => {
      const page = await revisitStep(server, { url: `${searchUrl}?change=true` })

      expect(page('a:contains("enter an address manually")').attr('href')).toBe(
        `${manualUrl}?change=true`
      )
    })

    test('Should go to the results, keeping change mode', async () => {
      const cookie = await getSessionCookie(server, searchUrl)

      const { statusCode, headers } = await post(
        `${searchUrl}?change=true`,
        { addressPostcode: 'AA3 1AB' },
        cookie
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(`${selectUrl}?change=true`)
    })

    test('Should show an error for a postcode that is not real', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: searchUrl,
        payload: { addressPostcode: 'not a postcode' }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Enter a real postcode'))
      expect(result).toEqual(expect.stringContaining(heading))
    })

    test('Should keep its search apart from the business address search', async () => {
      const cookie = await search({ addressPostcode: 'AA3 1AB', addressBuilding: 'Highfield' })

      const business = await revisitStep(server, { url: '/business-address', cookie })

      expect(business('#addressPostcode').val()).toBeFalsy()
    })

    test('Should keep the search out of the answers sent to the backend', async () => {
      const cookie = await search({ addressPostcode: 'AA3 1AB' })

      expect(await checkAnswersText(cookie)).not.toEqual(expect.stringContaining('AA3 1AB'))
    })
  })

  describe('Select', () => {
    test('Should list the addresses found in a dropdown under the question', async () => {
      const cookie = await search({ addressPostcode: 'AA3 1AB' })

      const page = await revisitStep(server, { url: selectUrl, cookie })

      expect(page('h1').text().trim()).toBe(heading)
      expect(page('select#address option').first().text().trim()).toBe('4 addresses found')
      expect(page('.govuk-back-link').attr('href')).toBe(searchUrl)
    })

    test('Should ask to confirm the only address found, with a manual entry link', async () => {
      const cookie = await search({ addressPostcode: 'AA3 1AB', addressBuilding: 'Highfield' })

      const page = await revisitStep(server, { url: selectUrl, cookie })

      expect(page('#address-found').text()).toEqual(expect.stringContaining('Highfield Farm'))
      expect(page('button[type="submit"]').text().trim()).toBe('Use this address')
      expect(page('a:contains("enter an address manually")').attr('href')).toBe(manualUrl)
    })

    test('Should say when no address was found', async () => {
      const cookie = await search({ addressPostcode: 'AA3 1AB', addressBuilding: 'Nowhere' })

      const page = await revisitStep(server, { url: selectUrl, cookie })

      expect(page('h1').text().trim()).toBe('No address found')
      expect(page('a:contains("Search again")').attr('href')).toBe(searchUrl)
    })

    test('Should send someone who has not searched to the search', async () => {
      const { headers } = await server.inject({ method: 'GET', url: selectUrl })

      expect(headers.location).toBe(searchUrl)
    })

    test('Should save the chosen address under usingPPPs and go on to the quantity', async () => {
      const cookie = await search({ addressPostcode: 'aa31ab' })

      const { statusCode, headers } = await post(selectUrl, { address: '1' }, cookie)

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/using-ppps/quantity')
      expect(await checkAnswersText(cookie)).toEqual(expect.stringContaining('Highfield Farm'))
    })

    test('Should select the address already chosen when coming back', async () => {
      const cookie = await search({ addressPostcode: 'AA3 1AB' })
      await post(selectUrl, { address: '2' }, cookie)

      const page = await revisitStep(server, { url: selectUrl, cookie })

      expect(page('select#address option:selected').val()).toBe('2')
    })

    test('Should show an error when no address is chosen', async () => {
      const cookie = await search({ addressPostcode: 'AA3 1AB' })

      const { result, statusCode } = await post(selectUrl, { address: '' }, cookie)

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Select an address'))
    })
  })

  describe('Manual entry', () => {
    const address = {
      addressLine1: '1 Barn Lane',
      addressLine2: '',
      addressTown: 'York',
      addressPostcode: 'YO1 7HH',
      addressRegion: 'england'
    }

    test('Should ask the question, with the address fields', async () => {
      const page = await revisitStep(server, { url: manualUrl })

      expect(page('h1').text().trim()).toBe(heading)
      expect(page('title').text()).toEqual(expect.stringContaining(`${heading} |`))
      expect(page('input[name="addressRegion"]')).toHaveLength(3)
      expect(page('.govuk-back-link').attr('href')).toBe(searchUrl)
      expect(page('main').text()).not.toEqual(expect.stringContaining('outside of Great Britain'))
    })

    test('Should save the address under usingPPPs and go on to the quantity', async () => {
      const cookie = await getSessionCookie(server, manualUrl)

      const { headers } = await post(manualUrl, address, cookie)
      const page = await revisitStep(server, { url: manualUrl, cookie })

      expect(headers.location).toBe('/using-ppps/quantity')
      expect(page('#addressLine1').val()).toBe('1 Barn Lane')
      expect(page('input[name="addressRegion"]:checked').val()).toBe('england')
    })

    test('Should show the GOV.UK message for a missing first line', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: manualUrl,
        payload: { ...address, addressLine1: '' }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Enter address line 1, typically the building and street')
      )
    })
  })

  test('Should tell the browser not to store any of the pages', async () => {
    const cookie = await answerStep(server, { url: searchUrl, payload: { addressPostcode: 'AA3 1AB' } })

    for (const url of [searchUrl, selectUrl, manualUrl]) {
      const { headers } = await server.inject({ method: 'GET', url, headers: { cookie } })

      expect(headers['cache-control']).toBe('no-store')
    }
  })
})
