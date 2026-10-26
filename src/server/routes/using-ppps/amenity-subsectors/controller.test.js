import { load } from 'cheerio'

import { createServer } from '#/server/server.js'
import { answerStep, revisitStep, checkedValues } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getSessionCookie, injectWithSession } from '#/test-helpers/session-helpers.js'
import { USING } from '#/server/routes/qualifying-questions/business-activities/items.js'

const url = '/using-ppps/amenity-subsectors'
const question = 'What amenity sectors do you apply PPPs in?'
const selectSubsectorOrOther = 'Select an amenity sector or describe your main type of work'

describe('#amenitySubsectorsController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /using-ppps/amenity-subsectors', () => {
    let page
    let statusCode

    const textOf = (selector) => page(selector).text().trim()

    beforeAll(async () => {
      const response = await server.inject({ method: 'GET', url })

      statusCode = response.statusCode
      page = load(response.result)
    })

    test('Should return the view with the question as its title and heading', () => {
      expect(statusCode).toBe(statusCodes.ok)
      expect(page('title').text()).toEqual(expect.stringContaining(`${question} |`))
      expect(textOf('h1')).toBe(question)
    })

    test('Should show the hint above the checkboxes', () => {
      expect(textOf('#amenitySubsectors-hint')).toBe('Select all that apply')
    })

    test('Should show every amenity sector, in order', () => {
      const labels = page('input[name="amenitySubsectors"]')
        .map((_index, input) => page(`label[for="${page(input).attr('id')}"]`).text().trim())
        .get()

      expect(labels).toEqual([
        'Parks',
        'Sports grounds, including golf courses',
        'Public or private property',
        'Infrastructure, such as roads, railways and waterways',
        'Utilities, such as transport and water companies'
      ])
    })

    test('Should offer Other after an "or" divider', () => {
      expect(textOf('h4')).toBe('or')
      expect(textOf('label[for="amenitySubsectorsOther"]')).toBe('Other')
      expect(textOf('#amenitySubsectorsOther-hint')).toBe(
        'Describe your main type of work in a few words'
      )
      expect(page('textarea#amenitySubsectorsOther')).toHaveLength(1)
    })

    test('Should link back to the PPP sectors once the route up to it is answered', async () => {
      const cookie = await getSessionCookie(server, '/business-activities')
      const answer = (path, payload) => answerStep(server, { url: path, payload, cookie })

      await answer('/business-activities', { businessActivities: [USING] })
      await answer('/business-name', { businessName: 'Pesticides Ltd' })
      await answer('/business-address', {
        addressPostcode: 'LS1 1AA',
        addressBuilding: 'Lower Meadow Barn'
      })
      await answer('/business-address/select', { address: '0' })
      await answer('/business-contact', {
        contactName: 'Jo Bloggs',
        contactTelephone: '01234 567890',
        contactEmail: 'jo@example.com'
      })
      await answer('/using-ppps/who-applies', { whoApplies: 'self' })
      await answer('/using-ppps/ppp-sectors', {
        professionalSectors: ['amenity'],
        professionalSectorsOther: ''
      })

      const revisited = await revisitStep(server, { url, cookie })

      expect(revisited('.govuk-back-link').attr('href')).toBe('/using-ppps/ppp-sectors')
    })
  })

  describe('POST /using-ppps/amenity-subsectors', () => {
    test('Should not tick an option whose value is part of a single rejected value', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/using-ppps/amenity-subsectors',
        payload: { amenitySubsectors: 'parks-x' }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(checkedValues(load(result), 'amenitySubsectors')).toEqual([])
    })

    const postAmenitySubsectors = (payload) =>
      injectWithSession(server, { method: 'POST', url, payload })

    // Ticks the PPP sectors first, since they decide where the page goes next.
    const afterSectors = async (professionalSectors, payload) => {
      const cookie = await answerStep(server, {
        url: '/using-ppps/ppp-sectors',
        payload: { professionalSectors, professionalSectorsOther: '' }
      })

      return server.inject({ method: 'POST', url, headers: { cookie }, payload })
    }

    test.each([
      [['amenity', 'horticulture'], '/using-ppps/horti-subsectors'],
      [['agriculture', 'amenity', 'horticulture'], '/using-ppps/horti-subsectors'],
      [['amenity'], '/using-ppps/storing'],
      [['agriculture', 'amenity'], '/using-ppps/member-schemes'],
      [['amenity', 'forestry'], '/using-ppps/storing']
    ])('Should go on from the sectors %o to %s', async (professionalSectors, location) => {
      const { statusCode, headers } = await afterSectors(professionalSectors, {
        amenitySubsectors: ['parks'],
        amenitySubsectorsOther: ''
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(location)
    })

    test('Should accept Other on its own', async () => {
      const { statusCode, headers } = await afterSectors(['amenity'], {
        amenitySubsectorsOther: 'Cemeteries'
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/using-ppps/storing')
    })

    test.each([
      [{ amenitySubsectorsOther: '' }],
      [{ amenitySubsectorsOther: '   ' }],
      [{ amenitySubsectors: ['parks'], amenitySubsectorsOther: 'Cemeteries' }],
      [{ amenitySubsectors: ['gardens'], amenitySubsectorsOther: '' }]
    ])('Should show an error for %o', async (payload) => {
      const { result, statusCode } = await postAmenitySubsectors(payload)

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(selectSubsectorOrOther))
    })

    test('Should show an error when Other is longer than 100 characters', async () => {
      const { result, statusCode } = await postAmenitySubsectors({
        amenitySubsectorsOther: 'a'.repeat(101)
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Please use 100 characters or fewer'))
    })
  })

  describe('Pre-populating from the session', () => {
    test('Should check the amenity sectors held in the session', async () => {
      const cookie = await answerStep(server, {
        url,
        payload: { amenitySubsectors: ['parks', 'utilities'], amenitySubsectorsOther: '' }
      })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'amenitySubsectors')).toEqual(['parks', 'utilities'])
      expect(page('#amenitySubsectorsOther').val()).toBeFalsy()
    })

    test('Should populate the Other text held in the session', async () => {
      const cookie = await answerStep(server, { url, payload: { amenitySubsectorsOther: ' Cemeteries ' } })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'amenitySubsectors')).toEqual([])
      expect(page('#amenitySubsectorsOther').val().trim()).toBe('Cemeteries')
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })
})
