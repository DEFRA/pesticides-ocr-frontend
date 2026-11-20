import { createServer } from '#/server/server.js'
import {
  answerStep,
  answerUpToStoring,
  checkedValues,
  revisitStep
} from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

describe('#storageLocationController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  const url = '/using-ppps/storage-location'

  describe('GET /using-ppps/storage-location', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({ method: 'GET', url })

      expect(result).toEqual(expect.stringContaining('Which Of Your Sites Store PPPs |'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should show the question, the hint and every option, naming the main business address', async () => {
      const cookie = await answerUpToStoring(server)
      const page = await revisitStep(server, { url, cookie })
      const labelFor = (value) => page(`input[value="${value}"]`).next('label').text().trim()

      expect(page('h1').text().trim()).toBe('Which of your sites store PPPs?')
      expect(page('#storageLocation-hint').text().trim()).toBe('Select all that apply')
      expect(labelFor('main-address')).toBe('At Lower Meadow Barn')
      expect(labelFor('another-address')).toBe('Another address')
    })

    test('Should name the first line of an international main business address', async () => {
      const cookie = await answerUpToStoring(server)
      await answerStep(server, {
        url: '/business-address/international',
        payload: { internationalAddress: 'Rue de la Paix 12\n75002 Paris\nFrance' },
        cookie
      })

      const page = await revisitStep(server, { url, cookie })

      expect(page('input[value="main-address"]').next('label').text().trim()).toBe('At Rue de la Paix 12')
    })

    test('Should fall back to the main business address when none has been given', async () => {
      const page = await revisitStep(server, { url })

      expect(page('input[value="main-address"]').next('label').text().trim()).toBe(
        'At the main business address'
      )
    })

    test('Should link back to storing products once the route up to it is answered', async () => {
      const cookie = await answerUpToStoring(server)
      await answerStep(server, { url: '/using-ppps/storing', payload: { storing: 'own' }, cookie })

      const page = await revisitStep(server, { url, cookie })

      expect(page('.govuk-back-link').attr('href')).toBe('/using-ppps/storing')
    })
  })

  describe('POST /using-ppps/storage-location', () => {
    const postStorageLocation = (payload) =>
      injectWithSession(server, { method: 'POST', url, payload })

    test('Should not error when the session has expired', async () => {
      const { statusCode } = await server.inject({
        method: 'POST',
        url,
        payload: { storageLocation: 'main-address' }
      })

      expect(statusCode).toBe(statusCodes.redirect)
    })

    test.each([
      [['main-address'], '/using-ppps/quantity'],
      [['another-address'], '/using-ppps/storage-addresses'],
      [['main-address', 'another-address'], '/using-ppps/storage-addresses']
    ])('Should redirect %o to %s', async (storageLocation, location) => {
      const { statusCode, headers } = await postStorageLocation({ storageLocation })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe(location)
    })

    test('Should save the answer under usingPPPs', async () => {
      const cookie = await answerUpToStoring(server)
      await answerStep(server, { url: '/using-ppps/storing', payload: { storing: 'own' }, cookie })
      await answerStep(server, { url, payload: { storageLocation: 'main-address' }, cookie })
      await answerStep(server, { url: '/using-ppps/quantity', payload: { quantity: '1-29' }, cookie })

      const page = await revisitStep(server, { url: '/check-answers', cookie })

      expect(page('main').text()).toEqual(expect.stringContaining('At the main business address'))
    })

    test.each([[{}], [{ storageLocation: 'somewhere' }], [{ storageLocation: 'main-and-other' }]])(
      'Should return view with error message for %o',
      async (payload) => {
        const { result, statusCode } = await postStorageLocation(payload)

        expect(result).toEqual(expect.stringContaining('Select which of your sites store PPPs'))
        expect(statusCode).toBe(statusCodes.ok)
      }
    )
  })

  describe('Pre-populating from the session', () => {
    test('Should check the options held in the session', async () => {
      const cookie = await answerStep(server, {
        url,
        payload: { storageLocation: ['main-address', 'another-address'] }
      })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'storageLocation')).toEqual(['main-address', 'another-address'])
    })

    test('Should check nothing when no option is held in the session', async () => {
      const page = await revisitStep(server, { url })

      expect(checkedValues(page, 'storageLocation')).toEqual([])
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })
})
