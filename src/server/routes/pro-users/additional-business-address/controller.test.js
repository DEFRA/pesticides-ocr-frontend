import { createServer } from '#/server/server.js'
import { answerStep, revisitStep } from '#/test-helpers/journey-helpers.js'
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
      const existing = {
        address: { addressTown: 'Leeds' },
        contact: {},
        activity: ['store']
      }

      const formSession = savePayload(address, {
        additionalAddresses: [existing]
      })

      expect(formSession['additionalAddresses']).toEqual([
        existing,
        { address }
      ])
    })

    test('Should update the in-progress entry when its contact has already been given', () => {
      const contact = { contactName: 'Jo Bloggs' }

      const formSession = savePayload(address, {
        additionalAddresses: [{ address: { addressTown: 'Leeds' }, contact }]
      })

      expect(formSession['additionalAddresses']).toEqual([{ address, contact }])
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

  describe('Pre-populating from the session', () => {
    const url = '/additional-addresses/address'

    const address = {
      addressLine1: 'Lower Meadow Barn',
      addressLine2: 'Mill Lane',
      addressTown: 'Farm town',
      addressCounty: 'Farmshire',
      addressPostcode: 'LS1 1AA'
    }

    test('Should populate the address of the entry in progress', async () => {
      const cookie = await answerStep(server, { url, payload: address })
      await answerStep(server, {
        url: '/additional-addresses/contact',
        payload: { contactName: 'Jo Bloggs', contactTelephone: '01234 567890', contactEmail: 'jo@example.com' },
        cookie
      })

      const page = await revisitStep(server, { url, cookie })

      Object.entries(address).forEach(([field, value]) => {
        expect(page(`#${field}`).val()).toBe(value)
      })
    })

    test('Should render the address empty when the latest entry is complete', async () => {
      const cookie = await answerStep(server, { url, payload: address })
      await answerStep(server, {
        url: '/additional-addresses/activity',
        payload: { addressActivities: ['store'] },
        cookie
      })

      const page = await revisitStep(server, { url, cookie })

      expect(page('#addressLine1').val()).toBeFalsy()
    })

    test('Should render the address empty when no entry is held in the session', async () => {
      const page = await revisitStep(server, { url })

      Object.keys(address).forEach((field) => {
        expect(page(`#${field}`).val()).toBeFalsy()
      })
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })
})
