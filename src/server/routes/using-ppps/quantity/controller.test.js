import { createServer } from '#/server/server.js'
import {
  answerStep,
  answerUpToStoring,
  checkedValues,
  revisitStep
} from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

const question = 'What quantity of PPPs or adjuvants do you use in a typical year?'

describe('#usingQuantityController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /using-ppps/quantity', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/using-ppps/quantity'
      })

      expect(result).toEqual(expect.stringContaining(`${question} |`))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should show the question, the hint and every band', async () => {
      const page = await revisitStep(server, { url: '/using-ppps/quantity' })
      const labels = page('input[name="quantity"]')
        .map((_index, input) => page(input).next('label').text().trim())
        .get()

      expect(page('h1').text().trim()).toBe(question)
      expect(page('.govuk-hint').first().text().trim()).toBe(
        'Estimate the total amount of undiluted product used in a typical year. If you use both liquid and solid products, use 1 litre as roughly equivalent to 1 kilogram. Select the range that best matches the total amount in litres or kilograms.'
      )
      expect(labels).toEqual(['1 to 29', '30 to 59', '60 to 149', '150 to 399', '400 and over'])
    })

    test('Should link back to storing products once the route up to it is answered', async () => {
      const cookie = await answerUpToStoring(server)
      await answerStep(server, { url: '/using-ppps/storing', cookie, payload: { storing: 'no' } })

      const page = await revisitStep(server, { url: '/using-ppps/quantity', cookie })

      expect(page('.govuk-back-link').attr('href')).toBe('/using-ppps/storing')
    })
  })

  describe('POST /using-ppps/quantity', () => {
    const postQuantity = (payload) =>
      injectWithSession(server, { method: 'POST', url: '/using-ppps/quantity', payload })

    test('Should not error when the session has expired', async () => {
      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/using-ppps/quantity',
        payload: { quantity: '1-29' }
      })

      expect(statusCode).toBe(statusCodes.redirect)
    })

    test.each(['1-29', '30-59', '60-149', '150-399', '400-plus'])(
      'Should redirect %s to check answers',
      async (quantity) => {
        const { statusCode, headers } = await postQuantity({ quantity })

        expect(statusCode).toBe(statusCodes.redirect)
        expect(headers.location).toBe('/check-answers')
      }
    )

    test('Should return view with error message when nothing is selected', async () => {
      const { result, statusCode } = await postQuantity({})

      expect(result).toEqual(expect.stringContaining('Select how much you use in a typical year'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should return view with error message for an unknown band', async () => {
      const { result, statusCode } = await postQuantity({ quantity: '80000' })

      expect(result).toEqual(expect.stringContaining('Select how much you use in a typical year'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('Pre-populating from the session', () => {
    const url = '/using-ppps/quantity'

    test('Should check the band held in the session', async () => {
      const cookie = await answerStep(server, { url, payload: { quantity: '150-399' } })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'quantity')).toEqual(['150-399'])
    })

    test('Should check nothing when no band is held in the session', async () => {
      const page = await revisitStep(server, { url })

      expect(checkedValues(page, 'quantity')).toEqual([])
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })
})
