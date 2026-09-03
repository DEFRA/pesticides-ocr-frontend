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
      contactName: 'John Smith',
      contactTelephone: '01234 567890',
      contactEmail: 'John.Smith@pesticides.co.uk'
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
      ['contactName', 'Enter a contact name'],
      ['contactTelephone', 'Enter a telephone number'],
      ['contactEmail', 'Enter an email address']
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
        contactEmail: 'not-an-email'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Enter a valid email address')
      )
    })

    test('Should return view with an error message when the telephone is invalid', async () => {
      const { statusCode, result } = await postContact({
        ...validContact,
        contactTelephone: 'not a number'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Enter a valid telephone number')
      )
    })
  })

  describe('Session', () => {
    const address = {
      addressLine1: '36 Portland Road',
      addressLine2: 'Brompton',
      addressTown: 'Northallerton',
      addressCounty: 'North Yorkshire',
      addressPostcode: 'DL62BQ'
    }

    const contact = {
      contactName: 'Matthew Quinton',
      contactTelephone: '07376235617',
      contactEmail: 'MQuinton@proton.me'
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
        additionalAddresses: [{ address }]
      })

      expect(formSession['additionalAddresses']).toEqual([{ address, contact }])
    })

    test('Should complete only the most recent entry', () => {
      const existing = { address: { addressTown: 'Leeds' }, contact: {} }

      const formSession = savePayload(contact, {
        additionalAddresses: [existing, { address }]
      })

      expect(formSession['additionalAddresses']).toEqual([
        existing,
        { address, contact }
      ])
    })

    test('Should start an entry when there is no address to complete', () => {
      const formSession = savePayload(contact)

      expect(formSession['additionalAddresses']).toEqual([{ contact }])
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
        additionalAddresses: [{ address, contact }]
      })
    })
  })
})
