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
        'address-activities': ['use']
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/check-additional-address')
    })

    test('Should redirect when several activities are selected', async () => {
      const { statusCode, headers } = await postActivity({
        'address-activities': ['use', 'store', 'records']
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/check-additional-address')
    })

    test('Should return view with error message when nothing is selected', async () => {
      const { statusCode, result } = await postActivity({
        'address-activities': []
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Select at least one address activity')
      )
    })

    test('Should return view with error message when an unknown value is sent', async () => {
      const { statusCode, result } = await postActivity({
        'address-activities': ['disposal']
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Select at least one address activity')
      )
    })
  })

  describe('Session', () => {
    const address = {
      'address-line-1': '36 Portland Road',
      'address-town': 'Northallerton',
      'address-postcode': 'DL62BQ'
    }

    const contact = {
      'contact-name': 'Matthew Quinton',
      'contact-telephone': '07376235617',
      'contact-email': 'MQuinton@proton.me'
    }

    const activity = ['use', 'store']
    const activityPayload = { 'address-activities': activity }

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
        'additional-addresses': [{ address, contact }]
      })

      expect(formSession['additional-addresses']).toEqual([
        { address, contact, activity }
      ])
    })

    test('Should complete only the most recent entry', () => {
      const existing = { address: { 'address-town': 'Leeds' }, contact: {} }

      const formSession = savePayload(activityPayload, {
        'additional-addresses': [existing, { address, contact }]
      })

      expect(formSession['additional-addresses']).toEqual([
        existing,
        { address, contact, activity }
      ])
    })

    test('Should start an entry when there is no address to complete', () => {
      const formSession = savePayload(activityPayload)

      expect(formSession['additional-addresses']).toEqual([{ activity }])
    })

    test('Should preserve other answers already in the session', () => {
      const formSession = savePayload(activityPayload, { 'business-name': 'Company 1' })

      expect(formSession['business-name']).toBe('Company 1')
    })
  })
})
