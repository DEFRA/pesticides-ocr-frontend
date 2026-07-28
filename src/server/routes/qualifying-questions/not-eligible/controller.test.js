import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

describe('#notEligibleController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /not-eligible', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/not-eligible'
      })

      expect(result).toEqual(expect.stringContaining('Not Eligible |'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })
})
