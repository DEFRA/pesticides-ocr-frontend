import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { createSessionRequest, injectWithSession, sessionResponseToolkit } from '#/test-helpers/session-helpers.js'
import { post as postHandler } from './controller.js'
import { post as postAddressHandler } from '../additional-business-address/controller.js'

describe('#additionalBusinessContactController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /additional-addresses/contact', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/additional-addresses/contact'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('action="/additional-addresses/contact"')
      )
    })
  })

  describe('POST /additional-addresses/contact', () => {
    const validContact = {
      'contact-name': 'John Smith',
      'contact-telephone': '01234 567890',
      'contact-email': 'John.Smith@pesticides.co.uk'
    }

    const postContact = (payload) =>
      injectWithSession(server, {
        method: 'POST',
        url: '/additional-addresses/contact',
        payload
      })

    test('Should redirect to the address activity page', async () => {
      const { statusCode, headers } = await postContact(validContact)

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/additional-addresses/activity')
    })

    test.each([
      ['contact-name', 'Enter a contact name'],
      ['contact-telephone', 'Enter a telephone number'],
      ['contact-email', 'Enter an email address']
    ])(
      'Should return view with an error message when %s is missing',
      async (field, message) => {
        const { statusCode, result } = await postContact({
          ...validContact,
          [field]: ''
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toEqual(expect.stringContaining(message))
      }
    )

    test('Should return view with an error message when the email is invalid', async () => {
      const { statusCode, result } = await postContact({
        ...validContact,
        'contact-email': 'not-an-email'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Enter a valid email address')
      )
    })

    test('Should return view with an error message when the telephone is invalid', async () => {
      const { statusCode, result } = await postContact({
        ...validContact,
        'contact-telephone': 'not a number'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Enter a valid telephone number')
      )
    })
  })

  describe('Session', () => {
    const address = {
      'address-line-1': '36 Portland Road',
      'address-line-2': 'Brompton',
      'address-town': 'Northallerton',
      'address-county': 'North Yorkshire',
      'address-postcode': 'DL62BQ'
    }

    const contact = {
      'contact-name': 'Matthew Quinton',
      'contact-telephone': '07376235617',
      'contact-email': 'MQuinton@proton.me'
    }

    const savePayload = (payload, formSession) => {
      const { request, readSession } = createSessionRequest({
        payload,
        formSession
      })

      postHandler.handler(request, sessionResponseToolkit)

      return readSession()
    }

    test('Should merge the contact into the address entry', () => {
      const formSession = savePayload(contact, {
        'additional-addresses': [{ address }]
      })

      expect(formSession['additional-addresses']).toEqual([{ address, contact }])
    })

    test('Should complete only the most recent entry', () => {
      const existing = { address: { 'address-town': 'Leeds' }, contact: {} }

      const formSession = savePayload(contact, {
        'additional-addresses': [existing, { address }]
      })

      expect(formSession['additional-addresses']).toEqual([
        existing,
        { address, contact }
      ])
    })

    test('Should start an entry when there is no address to complete', () => {
      const formSession = savePayload(contact)

      expect(formSession['additional-addresses']).toEqual([{ contact }])
    })

    test('Should build one object per address across both steps', () => {
      const { request: addressRequest, readSession } = createSessionRequest({
        payload: address
      })

      postAddressHandler.handler(addressRequest, sessionResponseToolkit)

      const contactRequest = createSessionRequest({
        payload: contact,
        formSession: readSession()
      })

      postHandler.handler(contactRequest.request, sessionResponseToolkit)

      expect(contactRequest.readSession()).toEqual({
        'additional-addresses': [{ address, contact }]
      })
    })
  })
})
