import { createServer } from '#/server/server.js'
import { revisitStep } from '#/test-helpers/journey-helpers.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

describe('#updateController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /update', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({ method: 'GET', url: '/update' })

      expect(result).toEqual(expect.stringContaining('Update Registration |'))
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('Should say the feature has not been built yet, as the heading', async () => {
      const page = await revisitStep(server, { url: '/update' })

      expect(page('h1').text().trim()).toBe('This feature has not been built yet')
      expect(page('main form')).toHaveLength(0)
    })

    test('Should link back to the start page', async () => {
      const page = await revisitStep(server, { url: '/update' })

      expect(page('.govuk-back-link').attr('href')).toBe('/start')
    })
  })

  test('Should tell the browser not to store the page', async () => {
    const { headers } = await server.inject({ method: 'GET', url: '/update' })

    expect(headers['cache-control']).toBe('no-store')
  })
})
