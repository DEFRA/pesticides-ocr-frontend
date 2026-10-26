import { createServer } from '#/server/server.js'
import { load } from 'cheerio'
import { answerStep, revisitStep } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'
import { SELLING, USING } from '#/server/routes/qualifying-questions/business-activities/items.js'

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

    test('Should show the question, the guidance and the inset text', async () => {
      const page = await revisitStep(server, { url: '/business-contact' })

      expect(page('h1').text().trim()).toBe('Who should we contact about your PPP activities?')
      expect(page('main p.govuk-body').first().text().trim()).toBe(
        "We may need to contact someone about your organisation's PPP activities. This should be a person with knowledge of these activities."
      )
      expect(page('.govuk-inset-text').text().trim()).toBe(
        'If these contact details change in the future they must be updated'
      )
    })

    test('Should label each field', async () => {
      const page = await revisitStep(server, { url: '/business-contact' })
      const labelFor = (field) => page(`label[for="${field}"]`).text().trim()

      expect(labelFor('contactName')).toBe('Contact name')
      expect(labelFor('contactJobTitle')).toBe('Job title or role (optional)')
      expect(labelFor('contactTelephone')).toBe('Telephone number')
      expect(labelFor('contactEmail')).toBe('Email address')
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

    test('Should redirect to who applies page when the business uses PPPs', async () => {
      const cookie = await answerStep(server, {
        url: '/business-activities',
        payload: { businessActivities: [USING, SELLING] }
      })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/business-contact',
        headers: { cookie },
        payload: {
          contactName: 'John Smith',
          contactTelephone: '01234 567890',
          contactEmail: 'John.Smith@pesticides.co.uk'
        }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/using-ppps/who-applies')
    })

    test('Should redirect to address activity page when the business does not use PPPs', async () => {
      const cookie = await answerStep(server, {
        url: '/business-activities',
        payload: { businessActivities: [SELLING, 'manufacturing'] }
      })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/business-contact',
        headers: { cookie },
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
      expect(result).toEqual(expect.stringContaining('Enter a telephone number'))
      expect(result).toEqual(expect.stringContaining('Enter an email address'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test.each([
      ['contactTelephone', 'Enter a telephone number'],
      ['contactEmail', 'Enter an email address']
    ])('Should show the enter message when %s is missing', async (field, message) => {
      const payload = {
        contactName: 'John Smith',
        contactTelephone: '01234 567890',
        contactEmail: 'John.Smith@pesticides.co.uk'
      }
      delete payload[field]

      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/business-contact',
        payload
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(message))
      expect(result).not.toEqual(expect.stringContaining('is required'))
    })

    test('Should show an error for a telephone number with invalid characters', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/business-contact',
        payload: {
          contactName: 'John Smith',
          contactTelephone: 'not-a-number',
          contactEmail: 'John.Smith@pesticides.co.uk'
        }
      })

      expect(result).toEqual(expect.stringContaining('Enter a valid telephone number'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should accept a job title or role and continue to address activity', async () => {
      const { statusCode, headers } = await injectWithSession(server, {
        method: 'POST',
        url: '/business-contact',
        payload: {
          contactName: 'John Smith',
          contactJobTitle: 'Farm manager',
          contactTelephone: '01234 567890',
          contactEmail: 'John.Smith@pesticides.co.uk'
        }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/address-activity')
    })

    test('Should continue when the job title or role is left empty', async () => {
      const { statusCode, headers } = await injectWithSession(server, {
        method: 'POST',
        url: '/business-contact',
        payload: {
          contactName: 'John Smith',
          contactJobTitle: '',
          contactTelephone: '01234 567890',
          contactEmail: 'John.Smith@pesticides.co.uk'
        }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/address-activity')
    })

    test('Should show an error when the job title or role is over 100 characters', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/business-contact',
        payload: {
          contactName: 'John Smith',
          contactJobTitle: 'a'.repeat(101),
          contactTelephone: '01234 567890',
          contactEmail: 'John.Smith@pesticides.co.uk'
        }
      })
      const page = load(result)

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Job title or role must be 100 characters or less')
      )
      expect(page('#contactJobTitle').val()).toBe('a'.repeat(101))
    })

    test('Should accept a job title or role of exactly 100 characters', async () => {
      const { statusCode, headers } = await injectWithSession(server, {
        method: 'POST',
        url: '/business-contact',
        payload: {
          contactName: 'John Smith',
          contactJobTitle: 'a'.repeat(100),
          contactTelephone: '01234 567890',
          contactEmail: 'John.Smith@pesticides.co.uk'
        }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/address-activity')
    })
  })

  describe('Pre-populating from the session', () => {
    const url = '/business-contact'

    const contact = {
      contactName: 'Jo Bloggs',
      contactJobTitle: 'Farm manager',
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

    test('Should accept a padded email address and save it trimmed', async () => {
      const cookie = await answerStep(server, {
        url,
        payload: { ...contact, contactEmail: ' jo@example.com ' }
      })

      const page = await revisitStep(server, { url, cookie })

      expect(page('#contactEmail').val()).toBe('jo@example.com')
    })

    test('Should save the contact without a job title or role when none is given', async () => {
      const { contactJobTitle, ...withoutJobTitle } = contact
      const cookie = await answerStep(server, { url, payload: withoutJobTitle })

      const page = await revisitStep(server, { url, cookie })

      expect(page('#contactName').val()).toBe(contact.contactName)
      expect(page('#contactJobTitle').val()).toBeFalsy()
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
