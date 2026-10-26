import { createServer } from '#/server/server.js'
import {
  answerStep,
  answerUpToStoring,
  revisitStep
} from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

const url = '/using-ppps/third-party-storage-contact'
const question = 'Who stores PPPs on your behalf?'

const contact = {
  contactName: 'Sam Store',
  businessName: 'Safe Storage Ltd',
  contactJobTitle: 'Warehouse manager',
  contactTelephone: '01234 567890',
  contactEmail: 'sam@example.com'
}

// A valid address of the given length, keeping each domain label within 63 characters.
const emailOfLength = (length) =>
  `${'a'.repeat(64)}@${'b'.repeat(length - 193)}.${'c'.repeat(61)}.${'d'.repeat(61)}.com`

describe('#storageContactController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /using-ppps/third-party-storage-contact', () => {
    test('Should ask the question, with the body text and the contact fields in order', async () => {
      const { result } = await server.inject({ method: 'GET', url })
      const page = await revisitStep(server, { url })
      const labels = page('.govuk-label')
        .map((_index, label) => page(label).text().trim())
        .get()

      expect(result).toEqual(expect.stringContaining(`${question} |`))
      expect(page('h1').text().trim()).toBe(question)
      expect(page('h1 + p.govuk-body').text().trim()).toBe(
        "We may need to contact someone about your organisation's PPP storage. This should be a person with knowledge of these activities."
      )
      expect(labels).toEqual([
        'Contact name',
        'Business name',
        'Job title or role (optional)',
        'Telephone number',
        'Email address'
      ])
      expect(page('.govuk-inset-text')).toHaveLength(0)
    })

    test("Should not ask the browser to fill in the user's own details for the contact", async () => {
      const page = await revisitStep(server, { url })

      expect(page('input[autocomplete]')).toHaveLength(0)
    })

    test('Should link back to storing products once the route up to it is answered', async () => {
      const cookie = await answerUpToStoring(server)
      await answerStep(server, {
        url: '/using-ppps/storing',
        payload: { storing: 'third-party' },
        cookie
      })

      const page = await revisitStep(server, { url, cookie })

      expect(page('.govuk-back-link').attr('href')).toBe('/using-ppps/storing')
    })
  })

  describe('POST /using-ppps/third-party-storage-contact', () => {
    test('Should go on to the quantity', async () => {
      const { statusCode, headers } = await injectWithSession(server, {
        method: 'POST',
        url,
        payload: contact
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/using-ppps/quantity')
    })

    test('Should accept a contact at the length limits', async () => {
      const { statusCode } = await injectWithSession(server, {
        method: 'POST',
        url,
        payload: {
          ...contact,
          contactName: 'a'.repeat(100),
          businessName: 'a'.repeat(100),
          contactTelephone: '0'.repeat(20),
          contactEmail: emailOfLength(254)
        }
      })

      expect(statusCode).toBe(statusCodes.redirect)
    })

    test('Should accept the contact without a job title', async () => {
      const { statusCode } = await injectWithSession(server, {
        method: 'POST',
        url,
        payload: { ...contact, contactJobTitle: '' }
      })

      expect(statusCode).toBe(statusCodes.redirect)
    })

    test.each([
      ['contactName', '', 'Enter a contact name'],
      ['contactName', '   ', 'Enter a contact name'],
      ['contactName', 'a'.repeat(101), 'Contact name must be 100 characters or less'],
      ['businessName', '', 'Enter a business name'],
      ['businessName', '   ', 'Enter a business name'],
      ['businessName', 'a'.repeat(101), 'Business name must be 100 characters or less'],
      ['contactJobTitle', 'a'.repeat(101), 'Job title or role must be 100 characters or less'],
      ['contactTelephone', '', 'Enter a telephone number'],
      ['contactTelephone', 'call me', 'Enter a valid telephone number'],
      ['contactTelephone', '0'.repeat(21), 'Telephone number must be 20 characters or less'],
      ['contactEmail', '', 'Enter an email address'],
      ['contactEmail', 'not an email', 'Enter a valid email address'],
      ['contactEmail', emailOfLength(255), 'Email address must be 254 characters or less']
    ])('Should show an error when %s is %o', async (field, value, message) => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url,
        payload: { ...contact, [field]: value }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(message))
    })

    test.each([
      ['contactTelephone', 'Enter a telephone number'],
      ['contactEmail', 'Enter an email address']
    ])('Should show the enter message when %s is missing', async (field, message) => {
      const { [field]: _omitted, ...payload } = contact

      const { result, statusCode } = await server.inject({ method: 'POST', url, payload })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(message))
      expect(result).not.toEqual(expect.stringContaining('is required'))
    })
  })

  describe('Pre-populating from the session', () => {
    test('Should populate the contact held in the session', async () => {
      const cookie = await answerStep(server, { url, payload: contact })

      const page = await revisitStep(server, { url, cookie })

      Object.entries(contact).forEach(([field, value]) => {
        expect(page(`#${field}`).val()).toBe(value)
      })
    })

    test('Should accept a padded email address and save it trimmed', async () => {
      const cookie = await answerStep(server, {
        url,
        payload: { ...contact, contactEmail: ' sam@example.com ' }
      })

      const page = await revisitStep(server, { url, cookie })

      expect(page('#contactEmail').val()).toBe('sam@example.com')
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })
})
