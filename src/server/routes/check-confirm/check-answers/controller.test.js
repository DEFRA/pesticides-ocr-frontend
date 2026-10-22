import { vi } from 'vitest'
import { load } from 'cheerio'

import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getSessionCookie } from '#/test-helpers/session-helpers.js'
import { config } from '#/config/config.js'
import { answerUpToStoring, completeJourney, revisitStep } from '#/test-helpers/journey-helpers.js'
import { ADDRESS_SEARCH_PAGE, ADDRESS_SELECT_PAGE } from '#/server/common/constants/address-pages.js'
import {
  OWN_STORAGE_ADDRESS_PAGE,
  OWN_STORAGE_ADDRESS_SELECT_PAGE
} from '#/server/common/helpers/journey.js'

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
      addressLine1: 'Lowfield Farm',
      addressTown: 'Leeds',
      addressPostcode: 'LS1 1AA',
      ...overrides.address
    })
    await post('/additional-addresses/contact', {
      contactName: 'Jane Doe',
      contactTelephone: '01111 222333',
      contactEmail: 'jane.doe@pesticides.co.uk',
      ...overrides.contact
    })
    await post('/additional-addresses/activity', {
      addressActivities: overrides.activity ?? ['store']
    })
  }

  const answerAs = (cookie) => (url, payload) =>
    server.inject({ method: 'POST', url, headers: { cookie }, payload })

  const completeProfessionalJourney = async () => {
    const cookie = await getSessionCookie(server, '/business-activities')
    const answer = answerAs(cookie)

    await answer('/business-activities', { businessActivities: ['distributing'] })
    await answer('/business-name', { businessName: 'Pesticides Ltd' })
    await answer('/business-address', { addressPostcode: 'LS1 1AA', addressBuilding: 'Lower Meadow Barn' })
    await answer('/business-address/select', { address: '0' })
    await answer('/business-contact', {
      contactName: 'Jo Bloggs',
      contactTelephone: '01234 567890',
      contactEmail: 'jo@example.com'
    })
    await answer('/address-activity', { addressActivities: ['use'] })

    return cookie
  }

  // An organisation that applies PPPs itself, in forestry only, and doesn't
  // store them: the route that reaches check answers through the PPP pages.
  const completeUsingJourney = async () => {
    const cookie = await answerUpToStoring(server)
    const answer = answerAs(cookie)

    await answer('/using-ppps/storing', { storing: 'no' })
    const quantity = await answer('/using-ppps/quantity', { quantity: '60-149' })

    return { cookie, quantity }
  }

  const startAnAddress = (cookie) =>
    answerAs(cookie)('/additional-addresses/address', {
      addressLine1: 'Abandoned Farm',
      addressTown: 'Leeds',
      addressPostcode: 'LS1 1AA'
    })

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
        businessActivities: ['manufacturing', 'selling']
      })
      await answer('/address-activity', { addressActivities: ['store'] })
      await answer('/using-ppps/storing', { storing: 'third-party' })
      await answer('/using-ppps/quantity', { quantity: '400-plus' })

      const { result } = await server.inject({
        method: 'GET',
        url: '/check-answers',
        headers: { cookie }
      })

      expect(result).toEqual(
        expect.stringContaining(
          'Manufacturing PPPs<br>Selling PPPs'
        )
      )
      expect(result).toEqual(
        expect.stringContaining(
          'Store plant protection products (PPPs) or adjuvants'
        )
      )
      expect(result).toEqual(
        expect.stringContaining('Yes, a third party stores them for us')
      )
      expect(result).toEqual(expect.stringContaining('400 and over litres or kilograms'))
    })

    test('Should show storing products and the quantity with links to change them once answered', async () => {
      const cookie = await getSessionCookie(server, '/using-ppps/storing')
      const answer = answerAs(cookie)

      await answer('/using-ppps/storing', { storing: 'own' })
      await answer('/using-ppps/quantity', { quantity: '1-29' })

      const page = load((await loadAnswers(cookie)).result)
      const rowFor = (key) =>
        page('.govuk-summary-list__row').filter(
          (_index, element) => page(element).find('dt').text().trim() === key
        )
      const storing = rowFor('Storing products')
      const quantity = rowFor('Quantity used in a typical year')

      expect(storing.closest('.govuk-summary-list').prev('h2').text().trim()).toBe(
        'PPP activity details'
      )
      expect(storing.find('.govuk-summary-list__value').text().trim()).toBe('Yes, at sites we own')
      expect(storing.find('a').attr('href')).toBe('/using-ppps/storing?change=true')
      expect(storing.find('.govuk-visually-hidden').text().trim()).toBe('storing products')

      expect(storing.next().find('dt').text().trim()).toBe('Quantity used in a typical year')
      expect(quantity.find('.govuk-summary-list__value').text().trim()).toBe(
        '1 to 29 litres or kilograms'
      )
      expect(quantity.find('a').attr('href')).toBe('/using-ppps/quantity?change=true')
      expect(quantity.find('.govuk-visually-hidden').text().trim()).toBe(
        'quantity used in a typical year'
      )
    })

    test('Should show the agricultural sectors straight after the sectors', async () => {
      const cookie = await getSessionCookie(server, '/using-ppps/ppp-sectors')
      const answer = answerAs(cookie)

      await answer('/using-ppps/ppp-sectors', {
        professionalSectors: ['agriculture'],
        professionalSectorsOther: ''
      })
      await answer('/using-ppps/agri-subsectors', {
        agriSubsectors: ['arable', 'outdoor-vegetables'],
        agriSubsectorsOther: ''
      })

      const page = load((await loadAnswers(cookie)).result)
      const row = page('.govuk-summary-list__row').filter(
        (_index, element) => page(element).find('dt').text().trim() === 'Agricultural sectors'
      )

      expect(row.prev().find('dt').text().trim()).toBe('Sectors')
      expect(row.find('.govuk-summary-list__value').html()).toEqual(
        expect.stringMatching(/Arable\s*<br>\s*Outdoor vegetables/)
      )
      expect(row.find('a').attr('href')).toBe('/using-ppps/agri-subsectors?change=true')
      expect(row.find('.govuk-visually-hidden').text().trim()).toBe('agricultural sectors')
    })

    test('Should show the amenity sectors straight after the agricultural sectors', async () => {
      const cookie = await getSessionCookie(server, '/using-ppps/ppp-sectors')
      const answer = answerAs(cookie)

      await answer('/using-ppps/agri-subsectors', { agriSubsectors: ['arable'], agriSubsectorsOther: '' })
      await answer('/using-ppps/amenity-subsectors', {
        amenitySubsectors: ['parks'],
        amenitySubsectorsOther: ''
      })

      const page = load((await loadAnswers(cookie)).result)
      const row = page('.govuk-summary-list__row').filter(
        (_index, element) => page(element).find('dt').text().trim() === 'Amenity sectors'
      )

      expect(row.prev().find('dt').text().trim()).toBe('Agricultural sectors')
      expect(row.find('.govuk-summary-list__value').text().trim()).toBe('Parks')
      expect(row.find('a').attr('href')).toBe('/using-ppps/amenity-subsectors?change=true')
      expect(row.find('.govuk-visually-hidden').text().trim()).toBe('amenity sectors')
    })

    test('Should show the horticultural sectors straight after the amenity sectors', async () => {
      const cookie = await getSessionCookie(server, '/using-ppps/ppp-sectors')
      const answer = answerAs(cookie)

      await answer('/using-ppps/amenity-subsectors', {
        amenitySubsectors: ['parks'],
        amenitySubsectorsOther: ''
      })
      await answer('/using-ppps/horti-subsectors', {
        hortiSubsectors: ['ornamentals'],
        hortiSubsectorsOther: ''
      })

      const page = load((await loadAnswers(cookie)).result)
      const row = page('.govuk-summary-list__row').filter(
        (_index, element) => page(element).find('dt').text().trim() === 'Horticultural sectors'
      )

      expect(row.prev().find('dt').text().trim()).toBe('Amenity sectors')
      expect(row.find('.govuk-summary-list__value').text().trim()).toBe('Ornamentals')
      expect(row.find('a').attr('href')).toBe('/using-ppps/horti-subsectors?change=true')
      expect(row.find('.govuk-visually-hidden').text().trim()).toBe('horticultural sectors')
    })

    test('Should show the other storage address straight after where products are stored', async () => {
      const cookie = await getSessionCookie(server, '/using-ppps/storing')
      const answer = answerAs(cookie)

      await answer('/using-ppps/storage-location', { storageLocation: 'main-and-other' })
      await answer('/using-ppps/own-storage-address/manual', {
        addressLine1: '1 Barn Lane',
        addressLine2: '',
        addressTown: 'York',
        addressPostcode: 'YO1 7HH',
        addressRegion: 'england'
      })

      const page = load((await loadAnswers(cookie)).result)
      const row = page('.govuk-summary-list__row').filter(
        (_index, element) => page(element).find('dt').text().trim() === 'Other storage address'
      )

      expect(row.prev().find('dt').text().trim()).toBe('Where products are stored')
      expect(row.find('.govuk-summary-list__value').html()).toEqual(
        expect.stringMatching(/1 Barn Lane\s*<br>\s*York\s*<br>\s*YO1 7HH\s*<br>\s*England/)
      )
      expect(row.find('a').attr('href')).toBe('/using-ppps/own-storage-address?change=true')
      expect(row.find('.govuk-visually-hidden').text().trim()).toBe('other storage address')
    })

    test('Should show the storage contact straight after storing products', async () => {
      const cookie = await getSessionCookie(server, '/using-ppps/storing')
      const answer = answerAs(cookie)

      await answer('/using-ppps/storing', { storing: 'third-party' })
      await answer('/using-ppps/third-party-storage-contact', {
        contactName: 'Sam Store',
        businessName: 'Safe Storage Ltd',
        contactJobTitle: 'Warehouse manager',
        contactTelephone: '01234 567890',
        contactEmail: 'sam@example.com'
      })

      const page = load((await loadAnswers(cookie)).result)
      const storing = page('.govuk-summary-list__row').filter(
        (_index, element) => page(element).find('dt').text().trim() === 'Storing products'
      )
      const rows = storing.nextAll().slice(0, 5)

      expect(rows.map((_index, row) => page(row).find('dt').text().trim()).get()).toEqual([
        'Storage contact name',
        'Storage business name',
        'Storage contact job title',
        'Storage contact telephone',
        'Storage contact email'
      ])
      expect(
        rows.map((_index, row) => page(row).find('.govuk-summary-list__value').text().trim()).get()
      ).toEqual(['Sam Store', 'Safe Storage Ltd', 'Warehouse manager', '01234 567890', 'sam@example.com'])
      rows.each((_index, row) => {
        expect(page(row).find('a').attr('href')).toBe('/using-ppps/third-party-storage-contact?change=true')
      })
      expect(rows.first().find('.govuk-visually-hidden').text().trim()).toBe('storage contact name')
    })

    test('Should show the processing answers in their own section', async () => {
      const cookie = await getSessionCookie(server, '/processing-ppps/products')
      const answer = answerAs(cookie)

      await answer('/processing-ppps/products', { products: 'both' })
      await answer('/processing-ppps/sites', { sites: '51-200' })
      await answer('/processing-ppps/quantity', { quantity: '300' })

      const page = load((await loadAnswers(cookie)).result)
      const section = page('h2')
        .filter((_index, element) => page(element).text().trim() === 'PPP processing details')
        .next('.govuk-summary-list')
      const rows = section.find('.govuk-summary-list__row')

      expect(rows.map((_index, row) => page(row).find('dt').text().trim()).get()).toEqual([
        'Products processed',
        'Processing sites',
        'Estimated annual quantity'
      ])
      expect(
        rows.map((_index, row) => page(row).find('.govuk-summary-list__value').text().trim()).get()
      ).toEqual(['Both PPPs and ingredients or adjuvants', '51 to 200', '300 kilograms or litres'])
      expect(rows.first().find('a').attr('href')).toBe('/processing-ppps/products?change=true')
    })

    test('Should not show the processing section without processing answers', async () => {
      const cookie = await completeJourney(server)

      const { result } = await loadAnswers(cookie)

      expect(result).not.toEqual(expect.stringContaining('PPP processing details'))
    })

    test('Should show where products are stored between storing products and the quantity', async () => {
      const cookie = await getSessionCookie(server, '/using-ppps/storing')
      const answer = answerAs(cookie)

      await answer('/using-ppps/storing', { storing: 'own' })
      await answer('/using-ppps/storage-location', { storageLocation: 'main-address' })
      await answer('/using-ppps/quantity', { quantity: '1-29' })

      const page = load((await loadAnswers(cookie)).result)
      const row = page('.govuk-summary-list__row').filter(
        (_index, element) => page(element).find('dt').text().trim() === 'Where products are stored'
      )

      expect(row.prev().find('dt').text().trim()).toBe('Storing products')
      expect(row.next().find('dt').text().trim()).toBe('Quantity used in a typical year')
      expect(row.find('.govuk-summary-list__value').text().trim()).toBe(
        'Only at the main business address'
      )
      expect(row.find('a').attr('href')).toBe('/using-ppps/storage-location?change=true')
      expect(row.find('.govuk-visually-hidden').text().trim()).toBe('where products are stored')
    })

    test('Should reach check answers for an organisation that uses PPPs, with its rows in order', async () => {
      const { cookie, quantity } = await completeUsingJourney()

      const page = load((await loadAnswers(cookie)).result)
      const pppRows = page('h2')
        .filter((_index, element) => page(element).text().trim() === 'PPP activity details')
        .next('.govuk-summary-list')
        .find('.govuk-summary-list__key')
        .map((_index, key) => page(key).text().trim())
        .get()

      expect(quantity.headers.location).toBe('/check-answers')
      expect(pppRows).toEqual([
        'Who applies PPPs',
        'Sectors',
        'Storing products',
        'Quantity used in a typical year'
      ])
    })

    test('Should omit the rows of questions that have no answer', async () => {
      const cookie = await getSessionCookie(server, '/business-name')

      await server.inject({
        method: 'POST',
        url: '/business-name',
        headers: { cookie },
        payload: { businessName: 'Pesticides Ltd' }
      })

      const { result } = await loadAnswers(cookie)

      const keys = load(result)('.govuk-summary-list__key')
        .map((_index, key) => load(key).text().trim())
        .get()

      expect(result).toEqual(expect.stringContaining('Business name'))
      expect(keys).not.toContain('Sectors')
      expect(result).not.toEqual(expect.stringContaining('Assurance schemes'))
      expect(keys).not.toContain('Storing products')
      expect(keys).not.toContain('Quantity used in a typical year')
    })

    test('Should show the contact job title or role with a link to change it when one was given', async () => {
      const cookie = await completeJourney(server)

      await server.inject({
        method: 'POST',
        url: '/business-contact?change=true',
        headers: { cookie },
        payload: {
          contactName: 'Jo Bloggs',
          contactJobTitle: 'Farm manager',
          contactTelephone: '01234 567890',
          contactEmail: 'jo@example.com'
        }
      })

      const page = load((await loadAnswers(cookie)).result)
      const row = page('.govuk-summary-list__row').filter(
        (_index, element) => page(element).find('dt').text().trim() === 'Job title or role'
      )

      expect(row).toHaveLength(1)
      expect(row.find('.govuk-summary-list__value').text().trim()).toBe('Farm manager')
      expect(row.find('a').attr('href')).toBe('/business-contact?change=true')
      expect(row.find('.govuk-visually-hidden').text().trim()).toBe('job title or role')
    })

    test('Should show who applies PPPs with a link to change it once answered', async () => {
      const cookie = await getSessionCookie(server, '/using-ppps/who-applies')

      await answerAs(cookie)('/using-ppps/who-applies', { whoApplies: 'contractor' })

      const page = load((await loadAnswers(cookie)).result)
      const row = page('.govuk-summary-list__row').filter(
        (_index, element) => page(element).find('dt').text().trim() === 'Who applies PPPs'
      )

      expect(row).toHaveLength(1)
      expect(row.find('.govuk-summary-list__value').text().trim()).toBe(
        'Another organisation applies PPPs on our behalf'
      )
      expect(row.find('a').attr('href')).toBe('/using-ppps/who-applies?change=true')
      expect(row.find('.govuk-visually-hidden').text().trim()).toBe('who applies PPPs')
    })

    test('Should not show a who applies PPPs row before it is answered', async () => {
      const cookie = await completeJourney(server)

      const { result } = await loadAnswers(cookie)

      expect(result).not.toEqual(expect.stringContaining('Who applies PPPs'))
    })

    describe('Contractor', () => {
      const rowsFor = (page, key) =>
        page('.govuk-summary-list__row').filter(
          (_index, element) => page(element).find('dt').text().trim() === key
        )

      test('Should show the contractor name and address straight after who applies PPPs, with links to change them', async () => {
        const cookie = await getSessionCookie(server, '/using-ppps/who-applies')
        const answer = answerAs(cookie)

        await answer('/using-ppps/who-applies', { whoApplies: 'contractor' })
        await answer('/using-ppps/contractor-address', {
          contractorName: 'Spray Contractors Ltd',
          addressLine1: '1 High Street',
          addressLine2: '',
          addressTown: 'York',
          addressPostcode: 'YO1 7HH',
          addressRegion: 'wales'
        })

        const page = load((await loadAnswers(cookie)).result)
        const name = rowsFor(page, 'Contractor name')
        const address = rowsFor(page, 'Contractor address')

        expect(
          rowsFor(page, 'Who applies PPPs').next().find('dt').text().trim()
        ).toBe('Contractor name')
        expect(name.next().find('dt').text().trim()).toBe('Contractor address')

        expect(name.find('.govuk-summary-list__value').text().trim()).toBe('Spray Contractors Ltd')
        expect(name.find('a').attr('href')).toBe('/using-ppps/contractor-address?change=true')
        expect(name.find('.govuk-visually-hidden').text().trim()).toBe('contractor name')

        expect(address.find('.govuk-summary-list__value').html().trim()).toBe(
          '1 High Street<br>York<br>YO1 7HH<br>Wales'
        )
        expect(address.find('a').attr('href')).toBe('/using-ppps/contractor-address?change=true')
        expect(address.find('.govuk-visually-hidden').text().trim()).toBe('contractor address')
      })

      test('Should show the sectors straight after the contractor rows, with a link to change them', async () => {
        const cookie = await getSessionCookie(server, '/using-ppps/who-applies')
        const answer = answerAs(cookie)

        await answer('/using-ppps/who-applies', { whoApplies: 'contractor' })
        await answer('/using-ppps/contractor-address', {
          contractorName: 'Spray Contractors Ltd',
          addressLine1: '1 High Street',
          addressLine2: '',
          addressTown: 'York',
          addressPostcode: 'YO1 7HH',
          addressRegion: 'wales'
        })
        await answer('/using-ppps/ppp-sectors', {
          professionalSectors: ['amenity', 'public-services'],
          professionalSectorsOther: ''
        })

        const page = load((await loadAnswers(cookie)).result)
        const sectors = rowsFor(page, 'Sectors')

        expect(rowsFor(page, 'Contractor address').next().find('dt').text().trim()).toBe('Sectors')
        expect(sectors.closest('.govuk-summary-list').prev('h2').text().trim()).toBe(
          'PPP activity details'
        )
        expect(sectors.find('.govuk-summary-list__value').html().trim()).toBe(
          'Amenity<br>Public Services and Local Authorities'
        )
        expect(sectors.find('a').attr('href')).toBe('/using-ppps/ppp-sectors?change=true')
        expect(sectors.find('.govuk-visually-hidden').text().trim()).toBe('sectors')
      })

      test('Should show the Other text as the sectors when no sector was chosen', async () => {
        const cookie = await getSessionCookie(server, '/using-ppps/who-applies')
        const answer = answerAs(cookie)

        await answer('/using-ppps/who-applies', { whoApplies: 'self' })
        await answer('/using-ppps/ppp-sectors', { professionalSectorsOther: 'Vineyard management' })

        const page = load((await loadAnswers(cookie)).result)
        const sectors = rowsFor(page, 'Sectors')

        expect(rowsFor(page, 'Who applies PPPs').next().find('dt').text().trim()).toBe('Sectors')
        expect(sectors.find('.govuk-summary-list__value').text().trim()).toBe(
          'Vineyard management'
        )
      })

      test('Should not show the contractor rows before the contractor is given', async () => {
        const cookie = await getSessionCookie(server, '/using-ppps/who-applies')

        await answerAs(cookie)('/using-ppps/who-applies', { whoApplies: 'contractor' })

        const { result } = await loadAnswers(cookie)

        expect(result).not.toEqual(expect.stringContaining('Contractor name'))
        expect(result).not.toEqual(expect.stringContaining('Contractor address'))
      })
    })

    test('Should not show a job title or role row when it was left empty', async () => {
      const cookie = await completeJourney(server)

      await server.inject({
        method: 'POST',
        url: '/business-contact?change=true',
        headers: { cookie },
        payload: {
          contactName: 'Jo Bloggs',
          contactJobTitle: '',
          contactTelephone: '01234 567890',
          contactEmail: 'jo@example.com'
        }
      })

      const { result } = await loadAnswers(cookie)

      expect(result).toEqual(expect.stringContaining('Jo Bloggs'))
      expect(result).not.toEqual(expect.stringContaining('Job title or role'))
    })

    test('Should escape answers rather than trusting them as markup', async () => {
      const cookie = await getSessionCookie(server, '/business-name')

      await server.inject({
        method: 'POST',
        url: '/business-name',
        headers: { cookie },
        payload: { businessName: '<img src=x onerror=alert(1)>' }
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
          address: { addressLine1: 'Highfield Farm' }
        })

        const { result } = await loadAnswers(cookie)

        expect(additionalAddressCount(result)).toBe('2')
      })

      test('Should not show the count when the loop was never entered', async () => {
        const cookie = await getSessionCookie(server, '/business-name')

        const { result } = await loadAnswers(cookie)

        expect(additionalAddressCount(result)).toBeUndefined()
      })

      test('Should show a numbered card for each additional address', async () => {
        const cookie = await newSessionCookie()
        await addAnAddress(cookie)
        await addAnAddress(cookie, {
          address: { addressLine1: 'Highfield Farm' }
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
          address: { addressLine1: 'Highfield Farm' }
        })

        const { result } = await loadAnswers(cookie)

        expect(result.indexOf('Lowfield Farm')).toBeLessThan(
          result.indexOf('Highfield Farm')
        )
      })

      test('Should not offer a Change action for additional addresses', async () => {
        const cookie = await newSessionCookie()
        await addAnAddress(cookie)

        const { result } = await loadAnswers(cookie)

        expect(result).not.toEqual(expect.stringContaining('href="#">Change'))
        expect(result).not.toEqual(
          expect.stringContaining('additional addresses</span>')
        )
        expect(load(result)('.govuk-summary-card .govuk-summary-list__actions')).toHaveLength(0)
      })

      test('Should show a delete action on each card', async () => {
        const cookie = await newSessionCookie()
        await addAnAddress(cookie)
        await addAnAddress(cookie, { address: { addressLine1: 'Highfield Farm' } })

        const { result } = await loadAnswers(cookie)
        const deleteForms = load(result)('form[action$="/delete"]')

        expect(deleteForms.map((_index, form) => form.attribs.action).get()).toEqual([
          '/check-answers/additional-addresses/1/delete',
          '/check-answers/additional-addresses/2/delete'
        ])
        expect(deleteForms.map((_index, form) => form.attribs.method).get()).toEqual(['post', 'post'])
        expect(deleteForms.first().text()).toEqual(
          expect.stringContaining('Delete (Additional address 1)')
        )
      })

      test('Should delete the chosen additional address and return to check answers', async () => {
        const cookie = await newSessionCookie()
        await addAnAddress(cookie)
        await addAnAddress(cookie, { address: { addressLine1: 'Highfield Farm' } })

        const { statusCode, headers } = await server.inject({
          method: 'POST',
          url: '/check-answers/additional-addresses/1/delete',
          headers: { cookie }
        })
        const { result } = await loadAnswers(cookie)

        expect(statusCode).toBe(statusCodes.redirect)
        expect(headers.location).toBe('/check-answers')
        expect(additionalAddressCount(result)).toBe('1')
        expect(result).toEqual(expect.stringContaining('Highfield Farm'))
        expect(result).not.toEqual(expect.stringContaining('Lowfield Farm'))
      })

      test('Should not delete an additional address that does not exist', async () => {
        const cookie = await newSessionCookie()
        await addAnAddress(cookie)

        const { statusCode } = await server.inject({
          method: 'POST',
          url: '/check-answers/additional-addresses/2/delete',
          headers: { cookie }
        })
        const { result } = await loadAnswers(cookie)

        expect(statusCode).toBe(statusCodes.notFound)
        expect(additionalAddressCount(result)).toBe('1')
      })

      test('Should not delete an additional address from a GET request', async () => {
        const cookie = await newSessionCookie()
        await addAnAddress(cookie)

        const { statusCode } = await server.inject({
          method: 'GET',
          url: '/check-answers/additional-addresses/1/delete',
          headers: { cookie }
        })
        const { result } = await loadAnswers(cookie)

        expect(statusCode).toBe(statusCodes.notFound)
        expect(additionalAddressCount(result)).toBe('1')
      })

      test('Should not show an address that was abandoned before it was finished', async () => {
        const cookie = await newSessionCookie()
        await addAnAddress(cookie)
        await startAnAddress(cookie)

        const { result } = await loadAnswers(cookie)

        expect(additionalAddressCount(result)).toBe('1')
        expect(result).not.toEqual(expect.stringContaining('Abandoned Farm'))
      })

      test('Should start a fresh address after an abandoned one when adding another', async () => {
        const cookie = await newSessionCookie()
        await startAnAddress(cookie)

        await loadAnswers(cookie)
        const { result } = await server.inject({
          method: 'GET',
          url: '/additional-addresses/address',
          headers: { cookie }
        })

        expect(result).not.toEqual(expect.stringContaining('Abandoned Farm'))
      })

      test('Should reject an address number that is not a positive whole number', async () => {
        const { statusCode } = await server.inject({
          method: 'POST',
          url: '/check-answers/additional-addresses/0/delete'
        })

        expect(statusCode).toBe(statusCodes.badRequest)
      })

      test('Should link to add another address with a back link to the address list', async () => {
        const cookie = await newSessionCookie()
        await addAnAddress(cookie)

        const { result } = await loadAnswers(cookie)
        const addPage = await server.inject({
          method: 'GET',
          url: '/additional-addresses/address',
          headers: { cookie }
        })

        expect(load(result)('a[href="/additional-addresses/address"]').text()).toBe('Add another address')
        expect(load(addPage.result)('.govuk-back-link').attr('href')).toBe('/check-additional-address')
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
          address: { addressLine1: '<img src=x onerror=alert(1)>' }
        })

        const { result } = await loadAnswers(cookie)

        expect(result).not.toEqual(expect.stringContaining('<img src=x'))
        expect(result).toEqual(expect.stringContaining('&lt;img src=x'))
      })
    })
  })

  describe('POST /check-answers', () => {
    // The submission goes to the backend register endpoint, so the backend is
    // stubbed here rather than relied on being up.
    const backendUrl = 'http://localhost:3001'
    let configuredBackendUrl

    beforeAll(() => {
      configuredBackendUrl = config.get('ocrBackend.url')
      config.set('ocrBackend.url', backendUrl)
    })

    afterAll(() => {
      config.set('ocrBackend.url', configuredBackendUrl)
    })

    const stubBackend = (response) =>
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)

    const created = (reference = 'PPP-123-45A') => ({
      status: statusCodes.created,
      json: async () => ({ reference })
    })

    const submit = (cookie) =>
      server.inject({
        method: 'POST',
        url: '/check-answers',
        ...(cookie ? { headers: { cookie } } : {}),
        payload: {}
      })

    const registerCalls = (fetchSpy) =>
      fetchSpy.mock.calls.filter(([url]) => url === `${backendUrl}/register`)

    afterEach(() => {
      vi.restoreAllMocks()
    })

    test('Should redirect to confirmation page', async () => {
      stubBackend(created())
      const cookie = await completeJourney(server)

      const { statusCode, headers } = await submit(cookie)

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/confirmation')
    })

    test('Should send the answers held in session to the backend', async () => {
      const fetchSpy = stubBackend(created())
      const cookie = await completeJourney(server)

      await submit(cookie)

      const [url, options] = fetchSpy.mock.lastCall

      expect(url).toBe(`${backendUrl}/register`)
      expect(options.method).toBe('POST')
      expect(options.headers).toEqual({ 'Content-Type': 'application/json' })
      expect(JSON.parse(options.body)).toEqual(
        expect.objectContaining({
          businessActivities: ['distributing'],
          businessName: 'Pesticides Ltd'
        })
      )
    })

    test('Should not send the address search to the backend', async () => {
      const fetchSpy = stubBackend(created())
      const cookie = await completeJourney(server)

      await submit(cookie)

      const [, options] = fetchSpy.mock.lastCall

      expect(JSON.parse(options.body)).not.toHaveProperty('addressSearch')
    })

    test('Should keep the reference the backend issued for the confirmation page', async () => {
      stubBackend(created('PPP-987-65Z'))
      const cookie = await completeJourney(server)

      await submit(cookie)

      const { result } = await server.inject({
        method: 'GET',
        url: '/confirmation',
        headers: { cookie }
      })

      expect(result).toEqual(expect.stringContaining('PPP-987-65Z'))
    })

    test('Should return a bad request when the backend rejects the answers', async () => {
      stubBackend({
        status: statusCodes.badRequest,
        statusText: 'Bad Request'
      })
      const cookie = await completeJourney(server)

      const { statusCode } = await submit(cookie)

      expect(statusCode).toBe(statusCodes.badRequest)
    })

    test('Should not record a reference when the backend did not create the registration', async () => {
      stubBackend({ status: statusCodes.internalServerError })
      const cookie = await completeJourney(server)

      const { statusCode } = await submit(cookie)

      expect(statusCode).toBe(statusCodes.internalServerError)

      // Nothing was stored, so the confirmation page has no reference to show.
      const confirmation = await server.inject({
        method: 'GET',
        url: '/confirmation',
        headers: { cookie }
      })

      expect(confirmation.statusCode).toBe(statusCodes.badData)
    })

    test('Should send the user to the first unanswered question instead of submitting', async () => {
      const fetchSpy = stubBackend(created())
      const cookie = await getSessionCookie(server, '/business-activities')

      await answerAs(cookie)('/business-activities', { businessActivities: ['selling'] })
      const { statusCode, headers } = await submit(cookie)

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/business-name?change=true')
      expect(registerCalls(fetchSpy)).toHaveLength(0)
    })

    test('Should send storing products and the quantity band for an organisation that uses PPPs', async () => {
      const fetchSpy = stubBackend(created())
      const { cookie } = await completeUsingJourney()

      const { headers } = await submit(cookie)

      const [, options] = registerCalls(fetchSpy).at(-1)
      const body = JSON.parse(options.body)

      expect(headers.location).toBe('/confirmation')
      expect(body.usingPPPs).toEqual(expect.objectContaining({ storing: 'no', quantity: '60-149' }))
      expect(body).not.toHaveProperty('storing')
      expect(body).not.toHaveProperty('quantity')
    })

    test('Should not send an address that was abandoned before it was finished', async () => {
      const fetchSpy = stubBackend(created())
      const cookie = await completeProfessionalJourney()
      await addAnAddress(cookie)
      await startAnAddress(cookie)

      await submit(cookie)

      const [, options] = fetchSpy.mock.lastCall
      const { additionalAddresses } = JSON.parse(options.body)

      expect(additionalAddresses).toHaveLength(1)
      expect(additionalAddresses[0].address.addressLine1).toBe('Lowfield Farm')
    })

    test('Should clear the answers once the registration is submitted', async () => {
      stubBackend(created())
      const cookie = await completeJourney(server)

      await submit(cookie)
      const businessName = await server.inject({
        method: 'GET',
        url: '/business-name',
        headers: { cookie }
      })

      expect(businessName.result).not.toEqual(expect.stringContaining('Pesticides Ltd'))
    })

    test('Should clear the address search once the registration is submitted', async () => {
      stubBackend(created())
      const cookie = await completeJourney(server)

      await submit(cookie)
      const search = await revisitStep(server, { url: ADDRESS_SEARCH_PAGE, cookie })
      const select = await server.inject({ method: 'GET', url: ADDRESS_SELECT_PAGE, headers: { cookie } })

      expect(search('#addressPostcode').val()).toBeFalsy()
      expect(search('#addressBuilding').val()).toBeFalsy()
      expect(select.statusCode).toBe(statusCodes.redirect)
      expect(select.headers.location).toBe(ADDRESS_SEARCH_PAGE)
    })

    test('Should clear the own storage address search once the registration is submitted', async () => {
      stubBackend(created())
      const cookie = await completeJourney(server)
      await server.inject({
        method: 'POST',
        url: OWN_STORAGE_ADDRESS_PAGE,
        headers: { cookie },
        payload: { addressPostcode: 'LS1 1AA', addressBuilding: 'Lower Meadow Barn' }
      })

      await submit(cookie)
      const search = await revisitStep(server, { url: OWN_STORAGE_ADDRESS_PAGE, cookie })
      const select = await server.inject({
        method: 'GET',
        url: OWN_STORAGE_ADDRESS_SELECT_PAGE,
        headers: { cookie }
      })

      expect(search('#addressPostcode').val()).toBeFalsy()
      expect(search('#addressBuilding').val()).toBeFalsy()
      expect(select.statusCode).toBe(statusCodes.redirect)
      expect(select.headers.location).toBe(OWN_STORAGE_ADDRESS_PAGE)
    })

    test('Should not submit the same registration twice', async () => {
      const fetchSpy = stubBackend(created())
      const cookie = await completeJourney(server)

      await submit(cookie)
      const { headers } = await submit(cookie)

      expect(registerCalls(fetchSpy)).toHaveLength(1)
      expect(headers.location).toBe('/business-activities?change=true')
    })

    test('Should register a second business in the same session without the first reference', async () => {
      const fetchSpy = stubBackend(created())
      const cookie = await completeJourney(server)

      await submit(cookie)
      await completeJourney(server, cookie)
      await submit(cookie)

      const [, options] = registerCalls(fetchSpy).at(-1)

      expect(registerCalls(fetchSpy)).toHaveLength(2)
      expect(JSON.parse(options.body)).not.toHaveProperty('confirmation-reference')
      expect(JSON.parse(options.body)).not.toHaveProperty('confirmationReference')
    })
  })

  test('Should tell the browser not to store the page', async () => {
    const { headers } = await server.inject({ method: 'GET', url: '/check-answers' })

    expect(headers['cache-control']).toBe('no-store')
  })

  describe('Changing an answer', () => {
    const backLinkOf = (html) => load(html)('.govuk-back-link').attr('href')
    const formActionOf = (html) => load(html)('main form').attr('action')

    const visit = (url, cookie) =>
      server.inject({ method: 'GET', url, headers: { cookie } })

    const submit = (url, cookie, payload) =>
      server.inject({ method: 'POST', url, headers: { cookie }, payload })

    test('Should link each answer to its page in change mode', async () => {
      const cookie = await completeJourney(server)

      const { result } = await loadAnswers(cookie)

      expect(result).toEqual(expect.stringContaining('href="/business-name?change=true"'))
      expect(result).toEqual(expect.stringContaining('href="/business-contact?change=true"'))
      expect(result).toEqual(expect.stringContaining('href="/address-activity?change=true"'))
      expect(result).not.toEqual(expect.stringContaining('href="/using-ppps/storing?change=true"'))
      expect(result).not.toEqual(expect.stringContaining('href="/using-ppps/quantity?change=true"'))
    })

    test('Should return to check answers with the amended value', async () => {
      const cookie = await completeJourney(server)

      const page = await visit('/business-name?change=true', cookie)
      const { statusCode, headers } = await submit('/business-name?change=true', cookie, {
        businessName: 'Crop Care Ltd'
      })
      const { result } = await loadAnswers(cookie)

      expect(formActionOf(page.result)).toBe('/business-name?change=true')
      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/check-answers')
      expect(result).toEqual(expect.stringContaining('Crop Care Ltd'))
      expect(result).not.toEqual(expect.stringContaining('Pesticides Ltd'))
    })

    test('Should link back to check answers without changing the answer', async () => {
      const cookie = await completeJourney(server)

      const page = await visit('/business-name?change=true', cookie)
      const { result } = await loadAnswers(cookie)

      expect(backLinkOf(page.result)).toBe('/check-answers')
      expect(result).toEqual(expect.stringContaining('Pesticides Ltd'))
    })

    test('Should keep returning to check answers after an invalid value', async () => {
      const cookie = await completeJourney(server)

      const invalid = await submit('/business-name?change=true', cookie, { businessName: '' })
      const valid = await submit('/business-name?change=true', cookie, {
        businessName: 'Crop Care Ltd'
      })

      expect(invalid.statusCode).toBe(statusCodes.ok)
      expect(invalid.result).toEqual(expect.stringContaining('Enter a business name'))
      expect(backLinkOf(invalid.result)).toBe('/check-answers')
      expect(formActionOf(invalid.result)).toBe('/business-name?change=true')
      expect(valid.headers.location).toBe('/check-answers')
    })

    test('Should return to check answers and offer additional addresses once products are used at the address', async () => {
      const cookie = await completeJourney(server)

      const activity = await submit('/address-activity?change=true', cookie, {
        addressActivities: ['use']
      })
      const { result } = await loadAnswers(cookie)

      expect(activity.headers.location).toBe('/check-answers')
      expect(result).toEqual(expect.stringContaining('Add another address'))
    })

    test('Should ask the PPP questions in turn once using PPPs is ticked', async () => {
      const cookie = await completeJourney(server)

      const activities = await submit('/business-activities?change=true', cookie, {
        businessActivities: ['using']
      })
      const whoApplies = await submit('/using-ppps/who-applies?change=true', cookie, { whoApplies: 'self' })
      const sectors = await submit('/using-ppps/ppp-sectors?change=true', cookie, {
        professionalSectors: ['forestry'],
        professionalSectorsOther: ''
      })
      const storing = await submit('/using-ppps/storing?change=true', cookie, { storing: 'no' })
      const quantity = await submit('/using-ppps/quantity?change=true', cookie, {
        quantity: '30-59'
      })

      expect(activities.headers.location).toBe('/using-ppps/who-applies?change=true')
      expect(whoApplies.headers.location).toBe('/using-ppps/ppp-sectors?change=true')
      expect(sectors.headers.location).toBe('/using-ppps/storing?change=true')
      expect(storing.headers.location).toBe('/using-ppps/quantity?change=true')
      expect(quantity.headers.location).toBe('/check-answers')
    })

    test('Should return to check answers once the business activities are changed', async () => {
      const cookie = await completeJourney(server)

      const { headers } = await submit('/business-activities?change=true', cookie, {
        businessActivities: ['only-storing']
      })

      expect(headers.location).toBe('/check-answers')
    })

    test('Should remove answers an amended answer makes irrelevant', async () => {
      const { cookie } = await completeUsingJourney()

      await submit('/using-ppps/ppp-sectors?change=true', cookie, {
        professionalSectors: ['horticulture'],
        professionalSectorsOther: ''
      })
      await submit('/using-ppps/horti-subsectors?change=true', cookie, {
        hortiSubsectors: ['ornamentals'],
        hortiSubsectorsOther: ''
      })
      await submit('/using-ppps/member-schemes?change=true', cookie, {
        memberSchemes: ['leaf'],
        memberSchemesOther: ''
      })
      const withSchemes = await loadAnswers(cookie)

      await submit('/using-ppps/ppp-sectors?change=true', cookie, {
        professionalSectors: ['forestry'],
        professionalSectorsOther: ''
      })
      const withoutSchemes = await loadAnswers(cookie)

      expect(withSchemes.result).toEqual(expect.stringContaining('Assurance schemes'))
      expect(withoutSchemes.result).not.toEqual(expect.stringContaining('Assurance schemes'))
    })

    test('Should remove storing products and the quantity once using PPPs is no longer ticked', async () => {
      const { cookie } = await completeUsingJourney()
      const withQuantity = await loadAnswers(cookie)

      await submit('/business-activities?change=true', cookie, {
        businessActivities: ['distributing']
      })
      const withoutQuantity = await loadAnswers(cookie)

      expect(withQuantity.result).toEqual(expect.stringContaining('60 to 149 litres or kilograms'))
      expect(withoutQuantity.result).not.toEqual(expect.stringContaining('Storing products'))
      expect(withoutQuantity.result).not.toEqual(
        expect.stringContaining('Quantity used in a typical year')
      )
    })

    test('Should link back to the previous page when moving through the journey', async () => {
      const cookie = await completeJourney(server)

      const contact = await visit('/business-contact', cookie)
      const address = await visit('/business-address', cookie)
      const name = await visit('/business-name', cookie)
      const activities = await visit('/business-activities', cookie)

      expect(backLinkOf(contact.result)).toBe('/business-address')
      expect(backLinkOf(address.result)).toBe('/business-name')
      expect(backLinkOf(name.result)).toBe('/business-activities')
      expect(backLinkOf(activities.result)).toBe('/')
    })

    test('Should not show a back link on check answers', async () => {
      const cookie = await completeJourney(server)

      const { result } = await loadAnswers(cookie)

      expect(backLinkOf(result)).toBeUndefined()
    })

    test('Should not offer to add an address when the professional questions do not apply', async () => {
      const cookie = await completeJourney(server)

      const { result } = await loadAnswers(cookie)

      expect(result).not.toEqual(expect.stringContaining('Add another address'))
    })

    test('Should continue to the next page when moving through the journey', async () => {
      const cookie = await completeJourney(server)

      const { headers } = await submit('/business-name', cookie, { businessName: 'Crop Care Ltd' })

      expect(headers.location).toBe('/business-address')
    })
  })
})
