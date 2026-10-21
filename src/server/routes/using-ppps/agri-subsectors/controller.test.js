import { load } from 'cheerio'

import { createServer } from '#/server/server.js'
import { answerStep, revisitStep, checkedValues } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getSessionCookie, injectWithSession } from '#/test-helpers/session-helpers.js'

const url = '/using-ppps/agri-subsectors'
const question = 'What agricultural sectors do you apply PPPs in?'
const selectSubsectorOrOther = 'Select an agricultural sector or describe your main type of work'

describe('#agriSubsectorsController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /using-ppps/agri-subsectors', () => {
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
      expect(textOf('#agriSubsectors-hint')).toBe('Select all that apply')
    })

    test('Should show every agricultural sector, in order', () => {
      const labels = page('input[name="agriSubsectors"]')
        .map((_index, input) => page(`label[for="${page(input).attr('id')}"]`).text().trim())
        .get()

      expect(labels).toEqual(['Arable', 'Outdoor vegetables', 'Grasslands and fodder crops'])
    })

    test('Should offer Other after an "or" divider', () => {
      expect(textOf('h4')).toBe('or')
      expect(textOf('label[for="agriSubsectorsOther"]')).toBe('Other')
      expect(textOf('#agriSubsectorsOther-hint')).toBe(
        'Describe your main type of work in a few words'
      )
      expect(page('textarea#agriSubsectorsOther')).toHaveLength(1)
    })

    test('Should link back to the PPP sectors once the route up to it is answered', async () => {
      const cookie = await getSessionCookie(server, '/business-activities')
      const answer = (path, payload) => answerStep(server, { url: path, payload, cookie })

      await answer('/business-activities', { businessActivities: ['using'] })
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
        professionalSectors: ['agriculture'],
        professionalSectorsOther: ''
      })

      const revisited = await revisitStep(server, { url, cookie })

      expect(revisited('.govuk-back-link').attr('href')).toBe('/using-ppps/ppp-sectors')
    })
  })

  describe('POST /using-ppps/agri-subsectors', () => {
    const postAgriSubsectors = (payload) =>
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
      [['agriculture', 'amenity'], '/using-ppps/amenity-subsector'],
      [['agriculture', 'horticulture'], '/using-ppps/horti-subsector'],
      [['agriculture', 'amenity', 'horticulture'], '/using-ppps/amenity-subsector'],
      [['agriculture'], '/using-ppps/member-schemes'],
      [['agriculture', 'forestry'], '/using-ppps/member-schemes']
    ])('Should go on from the sectors %o to %s', async (professionalSectors, location) => {
      const { statusCode, headers } = await afterSectors(professionalSectors, {
        agriSubsectors: ['arable'],
        agriSubsectorsOther: ''
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(location)
    })

    test('Should accept Other on its own', async () => {
      const { statusCode, headers } = await afterSectors(['agriculture'], {
        agriSubsectorsOther: 'Hops'
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/using-ppps/member-schemes')
    })

    test.each([
      [{ agriSubsectorsOther: '' }],
      [{ agriSubsectorsOther: '   ' }],
      [{ agriSubsectors: ['arable'], agriSubsectorsOther: 'Hops' }],
      [{ agriSubsectors: ['orchards'], agriSubsectorsOther: '' }]
    ])('Should show an error for %o', async (payload) => {
      const { result, statusCode } = await postAgriSubsectors(payload)

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(selectSubsectorOrOther))
    })

    test('Should show an error when Other is longer than 100 characters', async () => {
      const { result, statusCode } = await postAgriSubsectors({
        agriSubsectorsOther: 'a'.repeat(101)
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Please use 100 characters or fewer'))
    })
  })

  describe('Pre-populating from the session', () => {
    test('Should check the agricultural sectors held in the session', async () => {
      const cookie = await answerStep(server, {
        url,
        payload: { agriSubsectors: ['arable', 'grasslands-fodder'], agriSubsectorsOther: '' }
      })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'agriSubsectors')).toEqual(['arable', 'grasslands-fodder'])
      expect(page('#agriSubsectorsOther').val()).toBeFalsy()
    })

    test('Should populate the Other text held in the session', async () => {
      const cookie = await answerStep(server, { url, payload: { agriSubsectorsOther: ' Hops ' } })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'agriSubsectors')).toEqual([])
      expect(page('#agriSubsectorsOther').val().trim()).toBe('Hops')
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })
})
