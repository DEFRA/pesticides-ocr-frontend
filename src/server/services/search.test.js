import { searchRegistration } from './search.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

// Not in the shared status-codes constants, which only cover the codes the
// journey itself returns.
const SERVICE_UNAVAILABLE = 503

const jsonResponse = (body, status = statusCodes.ok) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  })

describe('#searchRegistration', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('Should ask the search API for the reference', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ reference: 'PPP-ABC-123' }))

    const result = await searchRegistration('PPP-ABC-123')

    const [url, options] = fetchMock.mock.lastCall

    expect(url.toString()).toBe(
      'http://localhost:3001/search?reference=PPP-ABC-123'
    )
    expect(options).toEqual({
      method: 'GET',
      headers: { accept: 'application/json' }
    })
    expect(result).toEqual({ reference: 'PPP-ABC-123' })
  })

  test('Should report not found when the registration does not exist', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, statusCodes.notFound))

    expect(await searchRegistration('PPP-ZZZ-999')).toEqual({
      statusCode: statusCodes.notFound,
      message: 'Registration not found'
    })
  })

  test('Should return a service unavailable error when the search API is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    // Returned rather than thrown, so the controller can render the failure on
    // the search page instead of the generic error page.
    expect(await searchRegistration('PPP-ABC-123')).toMatchObject({
      isBoom: true,
      output: { statusCode: SERVICE_UNAVAILABLE }
    })
  })

  test('Should carry the reason back when the search API rejects the request', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        { statusCode: 400, error: 'Bad Request', message: 'Invalid reference number' },
        statusCodes.badRequest
      )
    )

    // Returned rather than thrown, so the controller can show the reason on the
    // search page instead of the generic error page.
    expect(await searchRegistration('PPP-ABC-123')).toMatchObject({
      isBoom: true,
      output: {
        statusCode: statusCodes.badRequest,
        payload: { message: 'Invalid reference number' }
      }
    })
  })

  test('Should report an upstream failure as a bad request too', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred'
        },
        statusCodes.internalServerError
      )
    )

    // The upstream status is flattened to 400 rather than preserved.
    expect(await searchRegistration('PPP-ABC-123')).toMatchObject({
      isBoom: true,
      output: {
        statusCode: statusCodes.badRequest,
        payload: { message: 'An internal server error occurred' }
      }
    })
  })
})
