import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

describe('#quantityController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /quantity', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/quantity'
      })

      expect(result).toEqual(expect.stringContaining('Quantity |'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('POST /quantity', () => {
    test('Should redirect to check answers page', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/quantity',
        payload: { quantity: '80000' }
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/check-answers')
    })

    test('Should return view with error message', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/quantity',
        payload: { quantity: '' }
      })

      expect(result).toEqual(expect.stringContaining('Enter a quantity'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })
})
