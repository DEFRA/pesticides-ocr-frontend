import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { createSessionRequest, injectWithSession, sessionResponseToolkit } from '#/test-helpers/session-helpers.js'
import { post as postHandler } from './controller.js'

describe('#additionalBusinessAddressController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /additional-addresses/address', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/additional-addresses/address'
      })

      expect(result).toEqual(
        expect.stringContaining('Additional business address')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should post the form back to this page', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/additional-addresses/address'
      })

      expect(result).toEqual(
        expect.stringContaining('action="/additional-addresses/address"')
      )
    })
  })

  describe('POST /additional-addresses/address', () => {
    const postAddress = (payload) =>
      injectWithSession(server, {
        method: 'POST',
        url: '/additional-addresses/address',
        payload
      })

    const validAddress = {
      addressLine1: 'Highfield Farm',
      addressLine2: '',
      addressTown: 'Farm town',
      addressCounty: '',
      addressPostcode: 'PH1 1FT'
    }

    test('Should redirect to the additional address contact page', async () => {
      const { statusCode, headers } = await postAddress(validAddress)

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/additional-addresses/contact')
    })

    test('Should redirect when the optional fields are omitted', async () => {
      const { statusCode, headers } = await postAddress({
        addressLine1: 'Highfield Farm',
        addressTown: 'Farm town',
        addressPostcode: 'PH1 1FT'
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/additional-addresses/contact')
    })

    test('Should return view with error messages when required fields are empty', async () => {
      const { statusCode, result } = await postAddress({
        addressLine1: '',
        addressLine2: '',
        addressTown: '',
        addressCounty: '',
        addressPostcode: ''
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(
          'Enter the first line of your business&#39; address'
        )
      )
      expect(result).toEqual(expect.stringContaining('Enter town or city'))
      expect(result).toEqual(expect.stringContaining('Enter your postcode'))
    })

    test.each([
      ['addressLine1', 'Enter the first line of your business&#39; address'],
      ['addressTown', 'Enter town or city'],
      ['addressPostcode', 'Enter your postcode']
    ])(
      'Should return view with an error message when %s is missing',
      async (field, message) => {
        const { statusCode, result } = await postAddress({
          ...validAddress,
          [field]: ''
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toEqual(expect.stringContaining(message))
      }
    )
  })

  describe('Session', () => {
    const address = {
      addressLine1: 'Lower Meadow Barn',
      addressLine2: 'Mill Lane',
      addressTown: 'Farm town',
      addressCounty: 'Farmshire',
      addressPostcode: 'LS1 1AA'
    }

    const savePayload = (payload, formSession) => {
      const { request, readSession } = createSessionRequest({
        payload,
        formSession
      })

      postHandler.handler(request, sessionResponseToolkit)

      return readSession()
    }

    test('Should start a new entry keyed under additional-addresses', () => {
      const formSession = savePayload(address)

      expect(formSession['additionalAddresses']).toEqual([{ address }])
    })

    test('Should append a new entry when the previous one is complete', () => {
      const existing = { address: { addressTown: 'Leeds' }, contact: {} }

      const formSession = savePayload(address, {
        additionalAddresses: [existing]
      })

      expect(formSession['additionalAddresses']).toEqual([
        existing,
        { address }
      ])
    })

    test('Should update the in-progress entry rather than appending', () => {
      const formSession = savePayload(address, {
        additionalAddresses: [{ address: { addressTown: 'Leeds' } }]
      })

      expect(formSession['additionalAddresses']).toEqual([{ address }])
    })

    test('Should preserve other answers already in the session', () => {
      const formSession = savePayload(address, { businessName: 'Company 1' })

      expect(formSession['businessName']).toBe('Company 1')
    })
  })
})
