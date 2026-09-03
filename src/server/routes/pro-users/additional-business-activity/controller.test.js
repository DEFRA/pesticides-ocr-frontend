import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  createSessionRequest,
  injectWithSession,
  sessionResponseToolkit
} from '#/test-helpers/session-helpers.js'
import { post as postHandler } from './controller.js'

describe('#additionalBusinessActivityController', () => {
  let server

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
    const address = {
      addressLine1: '36 Portland Road',
      addressTown: 'Northallerton',
      addressPostcode: 'DL62BQ'
    }

    const contact = {
      contactName: 'Matthew Quinton',
      contactTelephone: '07376235617',
      contactEmail: 'MQuinton@proton.me'
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
})
