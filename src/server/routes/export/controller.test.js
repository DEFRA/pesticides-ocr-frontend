import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  testBackendUrl,
  useTestBackendUrl
} from '#/test-helpers/backend-helpers.js'

const csvResponse = (body) =>
  new Response(body, {
    status: statusCodes.ok,
    headers: { 'content-type': 'text/csv' }
  })

describe('#exportController', () => {
  let server
  let fetchMock

  useTestBackendUrl()

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const requestExport = (query = '?reference=PPP-ABC-123') =>
    server.inject({ method: 'GET', url: `/admin/export${query}` })

  // The reference goes to the backend as a query parameter, so read the
  // requested URL back rather than matching a request body.
  const exportedUrl = () => new URL(fetchMock.mock.lastCall[0])

  describe('GET /admin/export', () => {
    test('Should ask the backend for the export of the given reference', async () => {
      fetchMock.mockResolvedValue(csvResponse('reference\nPPP-ABC-123\n'))

      await requestExport()

      expect(exportedUrl().origin + exportedUrl().pathname).toBe(
        `${testBackendUrl}/export`
      )
      expect(exportedUrl().searchParams.get('reference')).toBe('PPP-ABC-123')
    })

    test('Should return the CSV the backend sent, unchanged', async () => {
      const csv = 'reference,businessName\nPPP-ABC-123,Pesticides Ltd\n'
      fetchMock.mockResolvedValue(csvResponse(csv))

      const { statusCode, result } = await requestExport()

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toBe(csv)
    })

    test('Should serve the export as CSV', async () => {
      fetchMock.mockResolvedValue(csvResponse('reference\nPPP-ABC-123\n'))

      const { headers } = await requestExport()

      expect(headers['content-type']).toEqual(
        expect.stringContaining('text/csv')
      )
    })
  })
})
