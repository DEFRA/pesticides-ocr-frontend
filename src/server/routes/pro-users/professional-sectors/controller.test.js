import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import { injectWithSession } from '#/test-helpers/session-helpers.js'

describe('#professionalSectorsController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  describe('GET /professional-sectors', () => {
    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/professional-sectors'
      })

      expect(result).toEqual(expect.stringContaining('Professional Sectors |'))
      expect(statusCode).toBe(statusCodes.ok)
    })
  })

  describe('POST /professional-sectors', () => {
    const postSectors = (payload) =>
      injectWithSession(server, {
        method: 'POST',
        url: '/professional-sectors',
        payload
      })

    test('Should redirect to member-schemes page when a sector is selected', async () => {
      const { statusCode, headers } = await postSectors({
        professionalSectors: 'amenity',
        professionalSectorsOther: ''
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/member-schemes')
    })

    test('Should redirect to member-schemes page when only Other is given', async () => {
      const { statusCode, headers } = await postSectors({
        professionalSectorsOther: 'Vineyard management'
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toBe('/member-schemes')
    })

    test('Should show an error when neither a sector nor Other is given', async () => {
      const { statusCode, result } = await postSectors({
        professionalSectorsOther: ''
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(
          'Select a professional sector or describe your main type of work'
        )
      )
    })

    test('Should show an error when both a sector and Other are given', async () => {
      const { statusCode, result } = await postSectors({
        professionalSectors: 'forestry',
        professionalSectorsOther: 'Vineyard management'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(
          'Select a professional sector or describe your main type of work'
        )
      )
    })

    test('Should show an error when Other is longer than 100 characters', async () => {
      const { statusCode, result } = await postSectors({
        professionalSectorsOther: 'x'.repeat(101)
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining(
          'Please use 100 characters or fewer'
        )
      )
    })
  })
})
