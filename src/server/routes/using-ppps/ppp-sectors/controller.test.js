import { load } from 'cheerio'

import { createServer } from '#/server/server.js'
import { answerStep, revisitStep, checkedValues } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

const question = 'Which sector are your PPP activities in?'
const selectSectorOrOther = 'Select a sector or describe your main type of work'

describe('#pppSectorsController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /ppp-sectors', () => {
    let page
    let statusCode

    const textOf = (selector) => page(selector).text().trim()

    beforeAll(async () => {
      const response = await server.inject({ method: 'GET', url: '/using-ppps/ppp-sectors' })

      statusCode = response.statusCode
      page = load(response.result)
    })

    test('Should return the view with its title, heading and body text', () => {
      expect(statusCode).toBe(statusCodes.ok)
      expect(page('title').text()).toEqual(expect.stringContaining(`${question} |`))
      expect(textOf('h1')).toBe(question)
      expect(textOf('legend')).toBe(question)
      // The design's body text starts with "Select all that apply.", which is
      // left out because the hint already says it.
      expect(textOf('h1 + p.govuk-body')).toBe(
        'Include activities where PPPs are applied by another organisation on your behalf.'
      )
    })

    test('Should show the hint above the checkboxes', () => {
      expect(textOf('#professionalSectors-hint')).toBe('Select all that apply.')
    })

    test('Should show every sector, in order', () => {
      const labels = page('input[name="professionalSectors"]')
        .map((_index, input) => page(`label[for="${page(input).attr('id')}"]`).text().trim())
        .get()

      expect(labels).toEqual([
        'Agriculture',
        'Amenity',
        'Business premises',
        'Forestry',
        'Horticulture',
        'Public Services and Local Authorities',
        'Schools and universities',
        'Sports Clubs and Facilities'
      ])
    })

    test('Should show the hint under each sector that has one', () => {
      const hints = page('.govuk-checkboxes__hint')
        .map((_index, hint) => page(hint).text().trim())
        .get()

      expect(hints).toEqual([
        'This includes arable, outdoor vegetables, grasslands and fodder crops.',
        'This includes managing public spaces, parks, sports grounds, golf courses, school fields, railway tracks, roadsides and industrial estates.',
        'This includes property maintenance and Caretaking.',
        'This includes managing woodlands, commercial timber forests, tree plantations and commercial woodland nurseries.',
        'This includes edible protected crops, orchards and soft fruit, and ornamentals.'
      ])
    })

    test('Should offer Other after an "or" divider', () => {
      expect(textOf('h4.govuk-heading-s')).toBe('or')
      expect(textOf('label[for="professionalSectorsOther"]')).toBe('Other')
      expect(textOf('#professionalSectorsOther-hint')).toBe(
        'Describe your main type of work in a few words'
      )
      expect(page('textarea#professionalSectorsOther')).toHaveLength(1)
    })
  })

  describe('POST /ppp-sectors', () => {
    const postSectors = (payload) =>
      injectWithSession(server, {
        method: 'POST',
        url: '/using-ppps/ppp-sectors',
        payload
      })

    test.each([
      [['agriculture'], '/using-ppps/agri-subsectors'],
      [['amenity'], '/using-ppps/amenity-subsector'],
      [['horticulture'], '/using-ppps/horti-subsector'],
      [['agriculture', 'horticulture'], '/using-ppps/agri-subsectors'],
      [['agriculture', 'amenity', 'horticulture'], '/using-ppps/agri-subsectors'],
      [['amenity', 'horticulture'], '/using-ppps/amenity-subsector'],
      [['horticulture', 'forestry'], '/using-ppps/horti-subsector'],
      [['business-premises'], '/using-ppps/storing'],
      [['forestry'], '/using-ppps/storing'],
      [['public-services', 'schools-universities', 'sports-clubs'], '/using-ppps/storing']
    ])('Should redirect %o to %s', async (professionalSectors, location) => {
      const { statusCode, headers } = await postSectors({
        professionalSectors,
        professionalSectorsOther: ''
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(location)
    })

    test('Should redirect to storing when only Other is given', async () => {
      const { statusCode, headers } = await postSectors({
        professionalSectorsOther: 'Vineyard management'
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/using-ppps/storing')
    })

    test('Should show an error when neither a sector nor Other is given', async () => {
      const { statusCode, result } = await postSectors({ professionalSectorsOther: '' })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(selectSectorOrOther))
    })

    test('Should show an error when Other is only spaces and no sector is given', async () => {
      const { statusCode, result } = await postSectors({ professionalSectorsOther: '   ' })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(selectSectorOrOther))
    })

    test('Should show an error when both a sector and Other are given', async () => {
      const { statusCode, result } = await postSectors({
        professionalSectors: 'forestry',
        professionalSectorsOther: 'Vineyard management'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(selectSectorOrOther))
    })

    test('Should show an error for a sector that is not offered', async () => {
      const { statusCode, result } = await postSectors({
        professionalSectors: 'agriculture-horticulture'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(selectSectorOrOther))
    })

    test('Should show an error when Other is longer than 100 characters', async () => {
      const { statusCode, result } = await postSectors({
        professionalSectorsOther: 'x'.repeat(101)
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Please use 100 characters or fewer'))
    })

    test('Should accept Other at exactly 100 characters', async () => {
      const { statusCode, headers } = await postSectors({
        professionalSectorsOther: 'x'.repeat(100)
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/using-ppps/storing')
    })
  })

  describe('Pre-populating from the session', () => {
    const url = '/using-ppps/ppp-sectors'

    test('Should check the sectors held in the session', async () => {
      const cookie = await answerStep(server, {
        url,
        payload: { professionalSectors: ['amenity', 'sports-clubs'] }
      })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'professionalSectors')).toEqual(['amenity', 'sports-clubs'])
      expect(page('#professionalSectorsOther').val()).toBe('')
    })

    test('Should populate the Other text held in the session, trimmed', async () => {
      const cookie = await answerStep(server, {
        url,
        payload: { professionalSectorsOther: '  Something else  ' }
      })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'professionalSectors')).toEqual([])
      expect(page('#professionalSectorsOther').val()).toBe('Something else')
    })

    test('Should render the fields empty when nothing is held in the session', async () => {
      const page = await revisitStep(server, { url })

      expect(checkedValues(page, 'professionalSectors')).toEqual([])
      expect(page('#professionalSectorsOther').val()).toBe('')
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })
})
