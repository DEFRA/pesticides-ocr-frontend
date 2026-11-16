import { load } from 'cheerio'

import { createServer } from '#/server/server.js'
import { answerStep, revisitStep, checkedValues } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

describe('#startController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /start', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({ method: 'GET', url: '/start' })

      expect(result).toEqual(expect.stringContaining('What Would You Like To Do |'))
      expect(result).toEqual(expect.stringContaining('Register for the first time'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should show the question and both options', async () => {
      const page = await revisitStep(server, { url: '/start' })
      const labelFor = (value) => page(`input[value="${value}"]`).next('label').text().trim()

      expect(page('h1').text().trim()).toBe('What would you like to do?')
      expect(labelFor('new')).toBe('Register for the first time')
      expect(labelFor('update')).toBe('Update an existing registration')
    })

    test('Should link back to the home page', async () => {
      const page = await revisitStep(server, { url: '/start' })

      expect(page('.govuk-back-link').attr('href')).toBe('/')
    })
  })

  describe('POST /start', () => {
    const postStart = (payload) => injectWithSession(server, { method: 'POST', url: '/start', payload })

    test('Should redirect to the business contact page to register for the first time', async () => {
      const { statusCode, headers } = await postStart({ registrationChoice: 'new' })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/business-contact')
    })

    test('Should redirect to the update page to update an existing registration', async () => {
      const { statusCode, headers } = await postStart({ registrationChoice: 'update' })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/update')
    })

    test('Should return view with error message when nothing is selected', async () => {
      const { result, statusCode } = await postStart({})

      expect(result).toEqual(expect.stringContaining('Select what you would like to do'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should return view with error message for an unknown option', async () => {
      const { result, statusCode } = await postStart({ registrationChoice: 'renew' })

      expect(result).toEqual(expect.stringContaining('Select what you would like to do'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should keep the choice out of the answers sent to the backend', async () => {
      const cookie = await answerStep(server, { url: '/start', payload: { registrationChoice: 'new' } })

      const { result } = await server.inject({ method: 'GET', url: '/check-answers', headers: { cookie } })

      expect(load(result)('main').text()).not.toEqual(expect.stringContaining('Register for the first time'))
    })
  })

  describe('Pre-populating from the session', () => {
    const url = '/start'

    test('Should check the choice held in the session', async () => {
      const cookie = await answerStep(server, { url, payload: { registrationChoice: 'update' } })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'registrationChoice')).toEqual(['update'])
    })

    test('Should check nothing when no choice is held in the session', async () => {
      const page = await revisitStep(server, { url })

      expect(checkedValues(page, 'registrationChoice')).toEqual([])
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })
})
