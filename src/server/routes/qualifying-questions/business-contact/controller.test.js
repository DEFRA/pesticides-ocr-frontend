import { createServer } from '#/server/server.js'
import { load } from 'cheerio'
import { answerStep, revisitStep } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

describe('#businessContactController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /business-contact', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/business-contact'
      })

      expect(result).toEqual(expect.stringContaining('Business Contact |'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('POST /business-contact', () => {
    test('Should redirect to address activity page', async () => {
      const { statusCode, headers } = await injectWithSession(server, {
        method: 'POST',
        url: '/business-contact',
        payload: {
          contactName: 'John Smith',
          contactTelephone: '01234 567890',
          contactEmail: 'John.Smith@pesticides.co.uk'
        }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/address-activity')
    })

    test('Should return view with error message', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/business-contact',
        payload: {
          contactName: '',
          contactTelephone: '',
          contactEmail: ''
        }
      })

      expect(result).toEqual(expect.stringContaining('Enter a contact name'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('Pre-populating from the session', () => {
    const url = '/business-contact'

    const contact = {
      contactName: 'Jo Bloggs',
      contactTelephone: '01234 567890',
      contactEmail: 'jo@example.com'
    }

    test('Should populate the contact details held in the session', async () => {
      const cookie = await answerStep(server, { url, payload: contact })

      const page = await revisitStep(server, { url, cookie })

      Object.entries(contact).forEach(([field, value]) => {
        expect(page(`#${field}`).val()).toBe(value)
      })
    })

    test('Should render the contact details empty when none are held in the session', async () => {
      const page = await revisitStep(server, { url })

      Object.keys(contact).forEach((field) => {
        expect(page(`#${field}`).val()).toBeFalsy()
      })
    })

    test('Should validate an amended value and show it rather than the session value', async () => {
      const cookie = await answerStep(server, { url, payload: contact })

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url,
        payload: { ...contact, contactEmail: 'not-an-email' },
        headers: { cookie }
      })
      const page = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Enter a valid email address'))
      expect(page('#contactEmail').val()).toBe('not-an-email')
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })
})
