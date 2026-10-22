import { createServer } from '#/server/server.js'
import {
  answerStep,
  answerUpToStoring,
  checkedValues,
  revisitStep
} from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

describe('#storingController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /storing', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/using-ppps/storing'
      })

      expect(result).toEqual(expect.stringContaining('Do you store products you apply? |'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should show the question, the hint and every option', async () => {
      const page = await revisitStep(server, { url: '/using-ppps/storing' })
      const labelFor = (value) => page(`input[value="${value}"]`).next('label').text().trim()

      expect(page('h1').text().trim()).toBe('Do you store products you apply?')
      expect(page('.govuk-hint').first().text().trim()).toBe('Select an option')
      expect(labelFor('own')).toBe('Yes, at sites we own')
      expect(labelFor('third-party')).toBe('Yes, a third party stores them for us')
      expect(labelFor('no')).toBe('No, we don’t store PPPs')
    })

    test('Should link back to the PPP sectors once the route up to it is answered', async () => {
      const cookie = await answerUpToStoring(server)

      const page = await revisitStep(server, { url: '/using-ppps/storing', cookie })

      expect(page('.govuk-back-link').attr('href')).toBe('/using-ppps/ppp-sectors')
    })
  })

  describe('POST /storing', () => {
    const postStoring = (payload) =>
      injectWithSession(server, { method: 'POST', url: '/using-ppps/storing', payload })

    test('Should not error when the session has expired', async () => {
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/using-ppps/storing',
        payload: { storing: 'no' }
      })

      expect(statusCode).toBe(statusCodes.redirect)
    })

    test.each([
      ['own', '/using-ppps/storage-location'],
      ['third-party', '/using-ppps/third-party-storage-contact'],
      ['no', '/using-ppps/quantity']
    ])('Should redirect %s to %s', async (storing, location) => {
      const { statusCode, headers } = await postStoring({ storing })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(location)
    })

    test('Should return view with error message when nothing is selected', async () => {
      const { result, statusCode } = await postStoring({})

      expect(result).toEqual(
        expect.stringContaining('Select if you store the products you apply')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should return view with error message for an unknown option', async () => {
      const { result, statusCode } = await postStoring({ storing: 'sometimes' })

      expect(result).toEqual(
        expect.stringContaining('Select if you store the products you apply')
      )
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('Pre-populating from the session', () => {
    const url = '/using-ppps/storing'

    test('Should check the option held in the session', async () => {
      const cookie = await answerStep(server, { url, payload: { storing: 'third-party' } })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'storing')).toEqual(['third-party'])
    })

    test('Should check nothing when no option is held in the session', async () => {
      const page = await revisitStep(server, { url })

      expect(checkedValues(page, 'storing')).toEqual([])
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })
})
