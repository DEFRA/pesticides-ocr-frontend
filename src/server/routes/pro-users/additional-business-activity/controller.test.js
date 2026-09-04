import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  createSessionRequest,
  injectWithSession,
  sessionResponseToolkit
} from '#/test-helpers/session-helpers.js'
import { get as getHandler, post as postHandler } from './controller.js'

describe('#additionalBusinessActivityController', () => {
  let server

  const address = {
    addressLine1: 'Lower Meadow Barn',
    addressTown: 'Farm town',
    addressPostcode: 'LS1 1AA'
  }

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /additional-addresses/activity', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/additional-addresses/activity'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Additional Business Activity |')
      )
      expect(result).toEqual(
        expect.stringContaining('What does your business do at this address?')
      )
      expect(result).toEqual(
        expect.stringContaining('Keep records of plant protection products')
      )
    })

    test('Should post the form back to this page', async () => {
      const { result } = await server.inject({
        method: 'GET',
        url: '/additional-addresses/activity'
      })

      expect(result).toEqual(
        expect.stringContaining('action="/additional-addresses/activity"')
      )
    })
  })

  describe('POST /additional-addresses/activity', () => {
    const postActivity = (payload) =>
      injectWithSession(server, {
        method: 'POST',
        url: '/additional-addresses/activity',
        payload
      })

    test('Should redirect to check-additional-address page', async () => {
      const { statusCode, headers } = await postActivity({
        addressActivities: ['use']
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/check-additional-address')
    })

    test('Should redirect when several activities are selected', async () => {
      const { statusCode, headers } = await postActivity({
        addressActivities: ['use', 'store', 'records']
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/check-additional-address')
    })

    test('Should return view with error message when nothing is selected', async () => {
      const { statusCode, result } = await postActivity({
        addressActivities: []
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Select at least one address activity')
      )
    })

    test('Should return view with error message when an unknown value is sent', async () => {
      const { statusCode, result } = await postActivity({
        addressActivities: ['disposal']
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Select at least one address activity')
      )
    })
  })

  describe('Session', () => {
    const contact = {
      contactName: 'John Smith',
      contactTelephone: '01234 567890',
      contactEmail: 'john.smith@pesticides.co.uk'
    }

    const activity = ['use', 'store']
    const activityPayload = { addressActivities: activity }

    const savePayload = (payload, formSession) => {
      const { request, readSession } = createSessionRequest({
        payload,
        formSession
      })

      postHandler.handler(request, sessionResponseToolkit)

      return readSession()
    }

    test('Should merge the activity into the address entry', () => {
      const formSession = savePayload(activityPayload, {
        additionalAddresses: [{ address, contact }]
      })

      expect(formSession['additionalAddresses']).toEqual([
        { address, contact, activity }
      ])
    })

    test('Should complete only the most recent entry', () => {
      const existing = { address: { addressTown: 'Leeds' }, contact: {} }

      const formSession = savePayload(activityPayload, {
        additionalAddresses: [existing, { address, contact }]
      })

      expect(formSession['additionalAddresses']).toEqual([
        existing,
        { address, contact, activity }
      ])
    })

    test('Should start an entry when there is no address to complete', () => {
      const formSession = savePayload(activityPayload)

      expect(formSession['additionalAddresses']).toEqual([{ activity }])
    })

    test('Should preserve other answers already in the session', () => {
      const formSession = savePayload(activityPayload, { businessName: 'Company 1' })

      expect(formSession['businessName']).toBe('Company 1')
    })
  })

  describe('Address line one hint', () => {
    const readContext = (formSession) => {
      const { request } = createSessionRequest({ formSession })

      return getHandler.handler(request, sessionResponseToolkit).context
    }

    test('Should read the first line of the most recent additional address', () => {
      const { currentAddressLineOne } = readContext({
        additionalAddresses: [{ address: { addressLine1: 'Leeds Road' } }, { address }]
      })

      expect(currentAddressLineOne).toBe('Lower Meadow Barn')
    })

    test('Should be undefined when no additional address has been started', () => {
      expect(readContext().currentAddressLineOne).toBeUndefined()
    })

    test('Should be undefined when the latest entry has no address yet', () => {
      const { currentAddressLineOne } = readContext({
        additionalAddresses: [{ activity: ['use'] }]
      })

      expect(currentAddressLineOne).toBeUndefined()
    })
  })
})
