import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getSessionCookie } from '#/test-helpers/session-helpers.js'

describe('#checkAdditionalAddressController', () => {
  let server

  const summaryCardTitle = 'Additional address details'
  const missingAnswerError = 'Select whether you want to add another address'

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const newSessionCookie = () =>
    getSessionCookie(server, '/additional-addresses/activity')

  const submitAddress = (cookie, overrides = {}) =>
    server.inject({
      method: 'POST',
      url: '/additional-addresses/address',
      headers: { cookie },
      payload: {
        'address-line-1': 'Highfield Farm',
        'address-town': 'Farm town',
        'address-postcode': 'PH1 1FT',
        ...overrides
      }
    })

  const submitContact = (cookie, overrides = {}) =>
    server.inject({
      method: 'POST',
      url: '/additional-addresses/contact',
      headers: { cookie },
      payload: {
        'contact-name': 'John Smith',
        'contact-telephone': '01234 567890',
        'contact-email': 'John.Smith@pesticides.co.uk',
        ...overrides
      }
    })

  const submitActivity = (cookie, activities = ['store', 'records']) =>
    server.inject({
      method: 'POST',
      url: '/additional-addresses/activity',
      headers: { cookie },
      payload: { 'address-activities': activities }
    })

  const addAnAddress = async (cookie, overrides = {}) => {
    await submitAddress(cookie, overrides.address)
    await submitContact(cookie, overrides.contact)
    await submitActivity(cookie, overrides.activities)
  }

  const checkPage = (cookie) =>
    server.inject({
      method: 'GET',
      url: '/check-additional-address',
      headers: { cookie }
    })

  describe('GET /check-additional-address', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/check-additional-address'
      })

      expect(result).toEqual(
        expect.stringContaining('Additional business addresses')
      )
      expect(result).toEqual(
        expect.stringContaining('Do you want to add another address?')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should not show a summary card when no address has been entered', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/check-additional-address'
      })

      expect(result).not.toEqual(expect.stringContaining(summaryCardTitle))
    })

    test('Should show the details of the address that was just entered', async () => {
      const cookie = await newSessionCookie()
      await addAnAddress(cookie)

      const { result, statusCode } = await checkPage(cookie)

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(summaryCardTitle))
      expect(result).toEqual(expect.stringContaining('Highfield Farm'))
      expect(result).toEqual(expect.stringContaining('John Smith'))
      expect(result).toEqual(
        expect.stringContaining('John.Smith@pesticides.co.uk')
      )
      expect(result).toEqual(expect.stringContaining('01234 567890'))
      expect(result).toEqual(
        expect.stringContaining(
          'Store plant protection products (PPPs) or adjuvants'
        )
      )
      expect(result).toEqual(
        expect.stringContaining(
          'Keep records of plant protection products (PPPs)'
        )
      )
    })

    test('Should only describe the most recently added address', async () => {
      const cookie = await newSessionCookie()
      await addAnAddress(cookie)
      await addAnAddress(cookie, {
        address: { 'address-line-1': 'Lowfield Farm' }
      })

      const { result } = await checkPage(cookie)

      expect(result).toEqual(expect.stringContaining('Lowfield Farm'))
      expect(result).not.toEqual(expect.stringContaining('Highfield Farm'))
    })

    test('Should show Change actions that are not yet wired up', async () => {
      const cookie = await newSessionCookie()
      await addAnAddress(cookie)

      const { result } = await checkPage(cookie)

      expect(result).toEqual(expect.stringContaining('href="#">Change'))
      expect(result).not.toEqual(
        expect.stringContaining('href="/additional-addresses/address">Change')
      )
      expect(result).not.toEqual(
        expect.stringContaining('href="/additional-addresses/contact">Change')
      )
      expect(result).not.toEqual(
        expect.stringContaining('href="/additional-addresses/activity">Change')
      )
    })

    test('Should escape answers rather than trusting them as markup', async () => {
      const cookie = await newSessionCookie()
      await addAnAddress(cookie, {
        address: { 'address-line-1': '<img src=x onerror=alert(1)>' }
      })

      const { result } = await checkPage(cookie)

      expect(result).not.toEqual(expect.stringContaining('<img src=x'))
      expect(result).toEqual(expect.stringContaining('&lt;img src=x'))
    })
  })

  describe('POST /check-additional-address', () => {
    test('Should redirect to the address page when Yes is selected', async () => {
      const cookie = await newSessionCookie()

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/check-additional-address',
        headers: { cookie },
        payload: { 'check-additional-address': 'yes' }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/additional-addresses/address')
    })

    test('Should redirect to the check answers page when No is selected', async () => {
      const cookie = await newSessionCookie()

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/check-additional-address',
        headers: { cookie },
        payload: { 'check-additional-address': 'no' }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/check-answers')
    })

    test('Should return view with error message when nothing is selected', async () => {
      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/check-additional-address',
        payload: {}
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(missingAnswerError))
    })

    test('Should return view with error message when the answer is not one of the radios', async () => {
      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/check-additional-address',
        payload: { 'check-additional-address': 'maybe' }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(missingAnswerError))
    })

    test('Should keep the summary card on the page when validation fails', async () => {
      const cookie = await newSessionCookie()
      await addAnAddress(cookie)

      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/check-additional-address',
        headers: { cookie },
        payload: {}
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(missingAnswerError))
      expect(result).toEqual(expect.stringContaining(summaryCardTitle))
      expect(result).toEqual(expect.stringContaining('Highfield Farm'))
      expect(result).toEqual(expect.stringContaining('John Smith'))
    })

    test('Should show the most recently added address on the error page', async () => {
      const cookie = await newSessionCookie()
      await addAnAddress(cookie)
      await addAnAddress(cookie, {
        address: { 'address-line-1': 'Lowfield Farm' }
      })

      const { result } = await server.inject({
        method: 'POST',
        url: '/check-additional-address',
        headers: { cookie },
        payload: {}
      })

      expect(result).toEqual(expect.stringContaining('Lowfield Farm'))
      expect(result).not.toEqual(expect.stringContaining('Highfield Farm'))
    })

    test('Should not show a summary card on the error page when no address has been entered', async () => {
      const cookie = await newSessionCookie()

      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/check-additional-address',
        headers: { cookie },
        payload: {}
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(missingAnswerError))
      expect(result).not.toEqual(expect.stringContaining(summaryCardTitle))
    })

    test('Should leave the entered addresses in the session when validation fails', async () => {
      const cookie = await newSessionCookie()
      await addAnAddress(cookie)

      await server.inject({
        method: 'POST',
        url: '/check-additional-address',
        headers: { cookie },
        payload: {}
      })

      const { result } = await checkPage(cookie)

      expect(result).toEqual(expect.stringContaining(summaryCardTitle))
      expect(result).toEqual(expect.stringContaining('Highfield Farm'))
    })
  })

  describe('GET /check-additional-address/remove', () => {
    test('Should remove the address that was just entered', async () => {
      const cookie = await newSessionCookie()
      await addAnAddress(cookie)

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/check-additional-address/remove',
        headers: { cookie }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/additional-addresses')

      const { result } = await checkPage(cookie)

      expect(result).not.toEqual(expect.stringContaining(summaryCardTitle))
    })

    test('Should remove only the most recently added address', async () => {
      const cookie = await newSessionCookie()
      await addAnAddress(cookie)
      await addAnAddress(cookie, {
        address: { 'address-line-1': 'Lowfield Farm' }
      })

      await server.inject({
        method: 'GET',
        url: '/check-additional-address/remove',
        headers: { cookie }
      })

      const { result } = await checkPage(cookie)

      expect(result).toEqual(expect.stringContaining(summaryCardTitle))
      expect(result).toEqual(expect.stringContaining('Highfield Farm'))
      expect(result).not.toEqual(expect.stringContaining('Lowfield Farm'))
    })

    test('Should redirect without erroring when there is nothing to remove', async () => {
      const cookie = await newSessionCookie()

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/check-additional-address/remove',
        headers: { cookie }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/additional-addresses')
    })
  })
})
