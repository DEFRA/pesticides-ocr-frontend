import { createServer } from '#/server/server.js'
import { answerStep, checkedValues, revisitStep } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

const url = '/processing-ppps/products'
const question = 'What products do you process in England, Scotland or Wales?'

describe('#processingProductsController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /processing-ppps/products', () => {
    test('Should ask the question, as the title and heading, with the hint and every option', async () => {
      const { result } = await server.inject({ method: 'GET', url })
      const page = await revisitStep(server, { url })
      const labels = page('.govuk-radios__label')
        .map((_index, label) => page(label).text().trim())
        .get()

      expect(result).toEqual(expect.stringContaining(`${question} |`))
      expect(page('h1').text().trim()).toBe(question)
      expect(page('#products-hint').text().trim()).toBe('Select an option')
      expect(labels).toEqual([
        'Plant protection products (PPPs) only',
        'Ingredients or adjuvants only',
        'Both PPPs and ingredients or adjuvants'
      ])
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })

  describe('POST /processing-ppps/products', () => {
    test('Should go on to /processing-ppps/sites', async () => {
      const { statusCode, headers } = await injectWithSession(server, {
        method: 'POST',
        url,
        payload: { products: 'ppps' }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/processing-ppps/sites')
    })

    test.each([[{}], [{ products: 'something-else' }]])('Should show an error for %o', async (payload) => {
      const { result, statusCode } = await server.inject({ method: 'POST', url, payload })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Select what products you process'))
    })

    test('Should check the option held in the session when coming back', async () => {
      const cookie = await answerStep(server, { url, payload: { products: 'ingredients' } })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'products')).toEqual(['ingredients'])
    })
  })
})
