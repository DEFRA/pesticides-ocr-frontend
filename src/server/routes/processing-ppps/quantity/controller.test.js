import { createServer } from '#/server/server.js'
import { answerStep, revisitStep } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

const url = '/processing-ppps/quantity'
const question =
  'What is the overall volume of PPPs, ingredients and adjuvants your business processes in a typical year?'

describe('#processingQuantityController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /processing-ppps/quantity', () => {
    test('Should ask the question, with the body text and a quantity in kilograms or litres', async () => {
      const { result } = await server.inject({ method: 'GET', url })
      const page = await revisitStep(server, { url })

      expect(result).toEqual(expect.stringContaining(`${question} |`))
      expect(page('h1').text().trim()).toBe(question)
      expect(page('h1 + p.govuk-body').text().trim()).toBe(
        'Give an estimate of the total amount of undiluted product you process. If you process both liquid and solid products, combine them using 1 litre as roughly equal to 1 kilogram.'
      )
      expect(page('label[for="quantity"]').text().trim()).toBe('Estimated annual quantity')
      expect(page('.govuk-input__suffix').text().trim()).toBe('Kilograms or litres')
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })

  describe('POST /processing-ppps/quantity', () => {
    test.each([['250'], ['0.5'], [' 1200 ']])('Should go on to check answers for %o', async (quantity) => {
      const { statusCode, headers } = await injectWithSession(server, {
        method: 'POST',
        url,
        payload: { quantity }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/check-answers')
    })

    test.each([
      [{}, 'Enter the estimated annual quantity'],
      [{ quantity: '' }, 'Enter the estimated annual quantity'],
      [{ quantity: 'lots' }, 'Estimated annual quantity must be a number greater than 0'],
      [{ quantity: '0' }, 'Estimated annual quantity must be a number greater than 0'],
      [{ quantity: '-5' }, 'Estimated annual quantity must be a number greater than 0']
    ])('Should show an error for %o', async (payload, message) => {
      const { result, statusCode } = await server.inject({ method: 'POST', url, payload })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining(message))
    })

    test('Should keep what was typed when it is not valid', async () => {
      const { result } = await server.inject({ method: 'POST', url, payload: { quantity: 'lots' } })

      expect(result).toEqual(expect.stringContaining('value="lots"'))
    })

    test('Should populate the quantity held in the session when coming back', async () => {
      const cookie = await answerStep(server, { url, payload: { quantity: '1200' } })

      const page = await revisitStep(server, { url, cookie })

      expect(page('#quantity').val()).toBe('1200')
    })
  })
})
