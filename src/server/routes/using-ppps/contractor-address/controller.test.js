import { load } from 'cheerio'

import { createServer } from '#/server/server.js'
import { answerStep, revisitStep, checkedValues } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  createSessionRequest,
  getSessionCookie,
  injectWithSession,
  sessionResponseToolkit
} from '#/test-helpers/session-helpers.js'
import { post } from './controller.js'

describe('#contractorAddressController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const url = '/using-ppps/contractor-address'

  const contractor = {
    contractorName: 'Spray Contractors Ltd',
    addressLine1: '1 High Street',
    addressLine2: 'Unit 2',
    addressTown: 'York',
    addressPostcode: 'YO1 7HH',
    addressRegion: 'england'
  }

  const labelFor = (page, id) => page(`label[for="${id}"]`).text().trim()

  // Answers the journey up to this page: a business that uses PPPs and has
  // another organisation apply them.
  const answerUpToContractor = async () => {
    const cookie = await getSessionCookie(server, '/business-activities')
    const answer = (path, payload) =>
      server.inject({ method: 'POST', url: path, headers: { cookie }, payload })

    await answer('/business-activities', { businessActivities: ['using'] })
    await answer('/business-name', { businessName: 'Pesticides Ltd' })
    await answer('/business-address', { addressPostcode: 'LS1 1AA', addressBuilding: 'Lower Meadow Barn' })
    await answer('/business-address/select', { address: '0' })
    await answer('/business-contact', {
      contactName: 'Jo Bloggs',
      contactTelephone: '01234 567890',
      contactEmail: 'jo@example.com'
    })
    await answer('/using-ppps/who-applies', { whoApplies: 'contractor' })

    return cookie
  }

  const loadCheckAnswers = async (cookie) => {
    const { result } = await server.inject({ method: 'GET', url: '/check-answers', headers: { cookie } })

    return load(result)
  }

  describe('GET /contractor-address', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toEqual(expect.stringContaining('Who applies PPPs on your behalf? |'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should ask for the contractor name and each part of their address', async () => {
      const page = await revisitStep(server, { url })

      expect(page('h1').text()).toBe('Who applies PPPs on your behalf?')
      expect(page('main p.govuk-body').first().text()).toBe(
        'Provide details of third parties that apply PPPs on your behalf, for example contract sprayers.'
      )
      expect(labelFor(page, 'contractorName')).toBe('Business or company name')
      expect(labelFor(page, 'addressLine1')).toBe('Address line 1')
      expect(labelFor(page, 'addressLine2')).toBe('Address line 2 (optional)')
      expect(labelFor(page, 'addressTown')).toBe('Town or city')
      expect(labelFor(page, 'addressPostcode')).toBe('Postcode')
      expect(page('button[type="submit"]').text().trim()).toBe('Continue')
    })

    test('Should size the fields as in the design', async () => {
      const page = await revisitStep(server, { url })
      const classesOf = (id) => page(`#${id}`).attr('class')

      expect(classesOf('contractorName')).toEqual(expect.stringContaining('govuk-!-width-two-thirds'))
      expect(classesOf('addressLine1')).toEqual(expect.stringContaining('govuk-!-width-one-half'))
      expect(classesOf('addressLine2')).toEqual(expect.stringContaining('govuk-!-width-one-half'))
      expect(classesOf('addressTown')).toEqual(expect.stringContaining('govuk-!-width-one-third'))
      expect(classesOf('addressPostcode')).toEqual(expect.stringContaining('govuk-input--width-10'))
    })

    test("Should not ask the browser to fill in the user's own details for the contractor", async () => {
      const page = await revisitStep(server, { url })

      expect(page('input[autocomplete]')).toHaveLength(0)
    })

    test('Should offer England, Scotland and Wales as the region', async () => {
      const page = await revisitStep(server, { url })

      expect(page('legend').text().trim()).toBe('Country')
      expect(page('legend').hasClass('govuk-fieldset__legend--s')).toBe(true)
      expect(
        page('input[name="addressRegion"]')
          .map((_index, input) => ({
            value: page(input).val(),
            text: labelFor(page, page(input).attr('id'))
          }))
          .get()
      ).toEqual([
        { value: 'england', text: 'England' },
        { value: 'scotland', text: 'Scotland' },
        { value: 'wales', text: 'Wales' }
      ])
    })

    test('Should link back to who applies PPPs', async () => {
      const cookie = await answerUpToContractor()

      const page = await revisitStep(server, { url, cookie })

      expect(page('.govuk-back-link')).toHaveLength(1)
      expect(page('.govuk-back-link').attr('href')).toBe('/using-ppps/who-applies')
    })

    test('Should link back to check answers in change mode', async () => {
      const cookie = await answerUpToContractor()

      const page = await revisitStep(server, { url: `${url}?change=true`, cookie })

      expect(page('.govuk-back-link').attr('href')).toBe('/check-answers')
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })

  describe('POST /contractor-address', () => {
    test.each([
      [contractor],
      [{ ...contractor, addressLine2: '' }],
      [{ ...contractor, addressPostcode: 'yo17hh', addressRegion: 'wales' }]
    ])('Should redirect to the PPP sectors page for %o', async (payload) => {
      const { statusCode, headers } = await injectWithSession(server, { method: 'POST', url, payload })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/using-ppps/ppp-sectors')
    })

    test('Should save the name and keep the address in its own object, like the business address', () => {
      const { request, readSession } = createSessionRequest({
        payload: contractor,
        formSession: { usingPPPs: { whoApplies: 'contractor' } }
      })

      post.handler(request, sessionResponseToolkit)

      expect(readSession().usingPPPs.contractor).toEqual({
        contractorName: 'Spray Contractors Ltd',
        address: {
          addressLine1: '1 High Street',
          addressLine2: 'Unit 2',
          addressTown: 'York',
          addressPostcode: 'YO1 7HH',
          addressRegion: 'england'
        }
      })
    })

    test('Should show the saved name and address on check answers', async () => {
      const cookie = await answerUpToContractor()
      await answerStep(server, { url, cookie, payload: { ...contractor, contractorName: '  Spray Contractors Ltd ' } })

      const page = await loadCheckAnswers(cookie)
      const rowValue = (key) =>
        page('.govuk-summary-list__row')
          .filter((_index, row) => page(row).find('dt').text().trim() === key)
          .find('.govuk-summary-list__value')
          .html()
          ?.trim()

      expect(rowValue('Contractor name')).toBe('Spray Contractors Ltd')
      expect(rowValue('Contractor address')).toBe('1 High Street<br>Unit 2<br>York<br>YO1 7HH<br>England')
    })

    // Change mode returns to the first unanswered page, which for anyone using a
    // contractor is the PPP sectors.
    test('Should carry on to the first unanswered page in change mode', async () => {
      const cookie = await answerUpToContractor()

      const { headers } = await server.inject({
        method: 'POST',
        url: `${url}?change=true`,
        headers: { cookie },
        payload: contractor
      })

      expect(headers.location).toBe('/using-ppps/ppp-sectors?change=true')
    })

    test.each([
      ['contractorName', { contractorName: '' }, 'Enter the business or company name'],
      ['contractorName', { contractorName: '   ' }, 'Enter the business or company name'],
      ['contractorName', { contractorName: 'a'.repeat(101) }, 'Business or company name must be 100 characters or less'],
      ['addressLine1', { addressLine1: '' }, 'Enter address line 1, typically the building and street'],
      ['addressLine1', { addressLine1: '   ' }, 'Enter address line 1, typically the building and street'],
      ['addressTown', { addressTown: '' }, 'Enter town or city'],
      ['addressPostcode', { addressPostcode: '' }, 'Enter a postcode'],
      ['addressPostcode', { addressPostcode: 'not a postcode' }, 'Enter a real postcode'],
      ['addressRegion', { addressRegion: undefined }, 'Select a country'],
      ['addressRegion', { addressRegion: 'france' }, 'Select a country']
    ])('Should show an error for %s given %o', async (field, change, message) => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url,
        payload: { ...contractor, ...change }
      })
      const page = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect(page('.govuk-error-summary a').text().trim()).toBe(message)
      expect(page('.govuk-error-summary a').attr('href')).toBe(`#${field}`)
      expect(page(`#${field}-error`).text()).toEqual(expect.stringContaining(message))
    })

    test('Should show an error for every required field left empty', async () => {
      const { result } = await server.inject({ method: 'POST', url, payload: {} })
      const page = load(result)

      expect(
        page('.govuk-error-summary a')
          .map((_index, link) => page(link).text().trim())
          .get()
      ).toEqual([
        'Enter the business or company name',
        'Enter address line 1, typically the building and street',
        'Enter town or city',
        'Enter a postcode',
        'Select a country'
      ])
    })
  })

  describe('Pre-populating from the session', () => {
    test('Should populate the contractor held in the session, including the region', async () => {
      const cookie = await answerStep(server, { url, payload: { ...contractor, addressRegion: 'scotland' } })

      const page = await revisitStep(server, { url, cookie })

      expect(page('#contractorName').val()).toBe('Spray Contractors Ltd')
      expect(page('#addressLine1').val()).toBe('1 High Street')
      expect(page('#addressLine2').val()).toBe('Unit 2')
      expect(page('#addressTown').val()).toBe('York')
      expect(page('#addressPostcode').val()).toBe('YO1 7HH')
      expect(checkedValues(page, 'addressRegion')).toEqual(['scotland'])
    })

    test('Should render the form empty when no contractor is held in the session', async () => {
      const page = await revisitStep(server, { url })

      expect(page('#contractorName').val()).toBeFalsy()
      expect(page('#addressLine1').val()).toBeFalsy()
      expect(page('#addressPostcode').val()).toBeFalsy()
      expect(checkedValues(page, 'addressRegion')).toEqual([])
    })

    test('Should keep the entered values when there is an error', async () => {
      const { result } = await server.inject({
        method: 'POST',
        url,
        payload: { ...contractor, addressPostcode: 'not a postcode', addressRegion: 'wales' }
      })
      const page = load(result)

      expect(page('#contractorName').val()).toBe('Spray Contractors Ltd')
      expect(page('#addressLine1').val()).toBe('1 High Street')
      expect(page('#addressPostcode').val()).toBe('not a postcode')
      expect(checkedValues(page, 'addressRegion')).toEqual(['wales'])
    })
  })
})
