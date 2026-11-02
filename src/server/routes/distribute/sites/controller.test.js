import { createServer } from '#/server/server.js'
import { answerStep, checkedValues, revisitStep } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

const url = '/distribute/sites'
const question = 'At how many sites do you distribute PPPs in Great Britain?'

describe('#distributeSitesController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /distribute/sites', () => {
    test('Should ask the question, as the title and heading, with the hint and every option', async () => {
      const { result } = await server.inject({ method: 'GET', url })
      const page = await revisitStep(server, { url })
      const labels = page('.govuk-radios__label')
        .map((_index, label) => page(label).text().trim())
        .get()

      expect(result).toEqual(expect.stringContaining(`${question} |`))
      expect(page('h1').text().trim()).toBe(question)
      expect(page('#sites-hint').text().trim()).toBe('Select the number of sites you are responsible for.')
      expect(labels).toEqual([
        '1 to 10',
        '11 to 50',
        '51 to 200',
        '201 to 400',
        '400 and over'
      ])
    })

    test('Should tell the browser not to store the page', async () => {
      const { headers } = await server.inject({ method: 'GET', url })

      expect(headers['cache-control']).toBe('no-store')
    })
  })

  describe('POST /distribute/sites', () => {
    test('Should go on to /distribute/quantity', async () => {
      const { statusCode, headers } = await injectWithSession(server, {
        method: 'POST',
        url,
        payload: { sites: '1-10' }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/distribute/quantity')
    })

    test.each([[{}], [{ sites: 'something-else' }]])('Should show an error for %o', async (payload) => {
      const { result, statusCode } = await server.inject({ method: 'POST', url, payload })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Select how many sites you distribute PPPs from'))
    })

    test('Should check the option held in the session when coming back', async () => {
      const cookie = await answerStep(server, { url, payload: { sites: '11-50' } })

      const page = await revisitStep(server, { url, cookie })

      expect(checkedValues(page, 'sites')).toEqual(['11-50'])
    })
  })
})
