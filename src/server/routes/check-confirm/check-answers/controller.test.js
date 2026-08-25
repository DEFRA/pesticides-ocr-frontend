import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getSessionCookie } from '#/test-helpers/session-helpers.js'

describe('#checkAnswersController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const loadAnswers = (cookie) =>
    server.inject({ method: 'GET', url: '/check-answers', headers: { cookie } })

  const addAnAddress = async (cookie, overrides = {}) => {
    const post = (url, payload) =>
      server.inject({ method: 'POST', url, headers: { cookie }, payload })

    await post('/additional-addresses/address', {
      'address-line-1': 'Lowfield Farm',
      'address-town': 'Leeds',
      'address-postcode': 'LS1 1AA',
      ...overrides.address
    })
    await post('/additional-addresses/contact', {
      'contact-name': 'Jane Doe',
      'contact-telephone': '01111 222333',
      'contact-email': 'jane.doe@pesticides.co.uk',
      ...overrides.contact
    })
    await post('/additional-addresses/activity', {
      'address-activities': overrides.activity ?? ['store']
    })
  }

  // The count row and the section heading share their wording, so anchor on
  // the summary list markup to read the row back rather than the heading.
  const additionalAddressCount = (html) =>
    html.match(
      /Additional addresses\s*<\/dt>\s*<dd class="govuk-summary-list__value">\s*([\s\S]*?)\s*<\/dd>/
    )?.[1]

  describe('GET /check-answers', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/check-answers'
      })

      expect(result).toEqual(expect.stringContaining('Check Answers |'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should show the answers a user gave, using the wording from the question pages', async () => {
      const cookie = await getSessionCookie(server, '/business-activities')

      const answer = (url, payload) =>
        server.inject({ method: 'POST', url, headers: { cookie }, payload })

      await answer('/business-activities', {
        'business-activities': ['manufacture', 'seller-amateur']
      })
      await answer('/address-activity', { 'address-activities': ['store'] })
      await answer('/quantity', {
        'quantity-type': 'area',
        'quantity-amount': '',
        'quantity-area': '67'
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/check-answers',
        headers: { cookie }
      })

      expect(result).toEqual(
        expect.stringContaining(
          'Manufacture, process or import<br>Sell amateur PPPs'
        )
      )
      expect(result).toEqual(
        expect.stringContaining(
          'Store plant protection products (PPPs) or adjuvants'
        )
      )
      expect(result).toEqual(expect.stringContaining('67 hectares'))
    })

    test('Should title the quantity row to match the type that was entered', async () => {
      const titleFor = async (payload) => {
        const cookie = await getSessionCookie(server, '/quantity')

        await server.inject({
          method: 'POST',
          url: '/quantity',
          headers: { cookie },
          payload
        })

        const { result } = await server.inject({
          method: 'GET',
          url: '/check-answers',
          headers: { cookie }
        })

        return result
      }

      const area = await titleFor({
        'quantity-type': 'area',
        'quantity-amount': '',
        'quantity-area': '67'
      })
      const amount = await titleFor({
        'quantity-type': 'amount',
        'quantity-amount': '80000',
        'quantity-area': ''
      })

      expect(area).toEqual(
        expect.stringContaining('Area covered by PPPs in the last year')
      )
      expect(area).not.toEqual(
        expect.stringContaining('Quantity of PPPs used in the last year')
      )
      expect(amount).toEqual(
        expect.stringContaining('Quantity of PPPs used in the last year')
      )
      expect(amount).not.toEqual(
        expect.stringContaining('Area covered by PPPs in the last year')
      )
    })

    test('Should omit the main customer row when that question was skipped', async () => {
      const cookie = await getSessionCookie(server, '/business-activities')

      await server.inject({
        method: 'POST',
        url: '/business-activities',
        headers: { cookie },
        payload: { 'business-activities': ['seller-amateur'] }
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/check-answers',
        headers: { cookie }
      })

      expect(result).not.toEqual(expect.stringContaining('Main customer'))
    })

    test('Should escape answers rather than trusting them as markup', async () => {
      const cookie = await getSessionCookie(server, '/business-name')

      await server.inject({
        method: 'POST',
        url: '/business-name',
        headers: { cookie },
        payload: { 'business-name': '<img src=x onerror=alert(1)>' }
      })

      const { result } = await server.inject({
        method: 'GET',
        url: '/check-answers',
        headers: { cookie }
      })

      expect(result).not.toEqual(expect.stringContaining('<img src=x'))
      expect(result).toEqual(expect.stringContaining('&lt;img src=x'))
    })

    describe('Additional addresses', () => {
      const newSessionCookie = () =>
        getSessionCookie(server, '/additional-addresses/activity')

      test('Should count the additional addresses that were added', async () => {
        const cookie = await newSessionCookie()
        await addAnAddress(cookie)
        await addAnAddress(cookie, {
          address: { 'address-line-1': 'Highfield Farm' }
        })

        const { result } = await loadAnswers(cookie)

        expect(additionalAddressCount(result)).toBe('2')
      })

      test('Should count none when the loop was never entered', async () => {
        const cookie = await getSessionCookie(server, '/business-name')

        const { result } = await loadAnswers(cookie)

        expect(additionalAddressCount(result)).toBe('0')
      })

      test('Should show a numbered card for each additional address', async () => {
        const cookie = await newSessionCookie()
        await addAnAddress(cookie)
        await addAnAddress(cookie, {
          address: { 'address-line-1': 'Highfield Farm' }
        })

        const { result } = await loadAnswers(cookie)

        expect(result).toEqual(expect.stringContaining('Additional address 1'))
        expect(result).toEqual(expect.stringContaining('Additional address 2'))
        expect(result).not.toEqual(
          expect.stringContaining('Additional address 3')
        )
      })

      test('Should show every detail of an additional address on its card', async () => {
        const cookie = await newSessionCookie()
        await addAnAddress(cookie, { activity: ['store', 'records'] })

        const { result, statusCode } = await loadAnswers(cookie)

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toEqual(expect.stringContaining('Lowfield Farm'))
        expect(result).toEqual(expect.stringContaining('Leeds'))
        expect(result).toEqual(expect.stringContaining('LS1 1AA'))
        expect(result).toEqual(expect.stringContaining('Jane Doe'))
        expect(result).toEqual(expect.stringContaining('01111 222333'))
        expect(result).toEqual(
          expect.stringContaining('jane.doe@pesticides.co.uk')
        )
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

      test('Should keep the cards in the order the addresses were added', async () => {
        const cookie = await newSessionCookie()
        await addAnAddress(cookie)
        await addAnAddress(cookie, {
          address: { 'address-line-1': 'Highfield Farm' }
        })

        const { result } = await loadAnswers(cookie)

        expect(result.indexOf('Lowfield Farm')).toBeLessThan(
          result.indexOf('Highfield Farm')
        )
      })

      test('Should show card Change actions that are not yet wired up', async () => {
        const cookie = await newSessionCookie()
        await addAnAddress(cookie)

        const { result } = await loadAnswers(cookie)

        expect(result).toEqual(expect.stringContaining('href="#">Change'))
        expect(result).not.toEqual(
          expect.stringContaining('href="/additional-addresses/address">Change')
        )
        expect(result).not.toEqual(
          expect.stringContaining('href="/additional-addresses/contact">Change')
        )
        expect(result).not.toEqual(
          expect.stringContaining(
            'href="/additional-addresses/activity">Change'
          )
        )
      })

      test('Should not show the section when no additional address was added', async () => {
        const cookie = await getSessionCookie(server, '/business-name')

        const { result } = await loadAnswers(cookie)

        expect(result).not.toEqual(expect.stringContaining('govuk-summary-card'))
        expect(result).not.toEqual(
          expect.stringContaining('Additional address 1')
        )
      })

      test('Should escape additional address answers rather than trusting them as markup', async () => {
        const cookie = await newSessionCookie()
        await addAnAddress(cookie, {
          address: { 'address-line-1': '<img src=x onerror=alert(1)>' }
        })

        const { result } = await loadAnswers(cookie)

        expect(result).not.toEqual(expect.stringContaining('<img src=x'))
        expect(result).toEqual(expect.stringContaining('&lt;img src=x'))
      })
    })
  })

  describe('POST /check-answers', () => {
    test('Should redirect to confirmation page', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/check-answers',
        payload: {}
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/confirmation')
    })
  })
})
