import { searchRegistration } from './search.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  testBackendUrl,
  useTestBackendUrl
} from '#/test-helpers/backend-helpers.js'

// Not in the shared status-codes constants, which only cover the codes the
// journey itself returns.
const SERVICE_UNAVAILABLE = 503

const jsonResponse = (body, status = statusCodes.ok, statusText = '') =>
  new Response(JSON.stringify(body), {
    status,
    statusText,
    headers: { 'content-type': 'application/json' }
  })

describe('#searchRegistration', () => {
  let fetchMock

  useTestBackendUrl()

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
      `${testBackendUrl}/search?reference=PPP-ABC-123`
    )
    expect(options).toEqual({
      method: 'GET',
      headers: { accept: 'application/json' }
    })
    // The registration is wrapped, so the controller can tell a hit from a miss
    // without inspecting the payload.
    expect(result).toEqual({
      isFound: true,
      data: { reference: 'PPP-ABC-123' }
    })
  })

  test('Should report not found when the registration does not exist', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, statusCodes.notFound))

    // A miss is an ordinary result rather than an error, so it carries no
    // status code.
    expect(await searchRegistration('PPP-ZZZ-999')).toEqual({
      isFound: false,
      message: expect.stringContaining('Registration not found')
    })
  })

  test('Should return a service unavailable error when the search API is unreachable', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'))

    // Returned rather than thrown, so the controller can render the failure on
    // the search page instead of the generic error page.
    expect(await searchRegistration('PPP-ABC-123')).toMatchObject({
      isBoom: true,
      output: {
        statusCode: SERVICE_UNAVAILABLE,
        payload: { message: 'Search API unavailable' }
      }
    })
  })

  test('Should carry the status text back when the search API rejects the request', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          statusCode: 400,
          error: 'Bad Request',
          message: 'Invalid reference number'
        },
        statusCodes.badRequest,
        'Bad Request'
      )
    )

    // Returned rather than thrown, so the controller can show the reason on the
    // search page instead of the generic error page. The reason comes from the
    // HTTP status text; the API's own `message` is not read.
    expect(await searchRegistration('PPP-ABC-123')).toMatchObject({
      isBoom: true,
      output: {
        statusCode: statusCodes.badRequest,
        payload: { message: 'There was an error: Bad Request' }
      }
    })
  })

  test('Should keep the upstream status when the search API fails', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(
        {
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'An internal server error occurred'
        },
        statusCodes.internalServerError,
        'Internal Server Error'
      )
    )

    // Boom replaces the message of a 500 with its own, so the status text does
    // not reach the payload here.
    expect(await searchRegistration('PPP-ABC-123')).toMatchObject({
      isBoom: true,
      output: {
        statusCode: statusCodes.internalServerError,
        payload: { message: 'An internal server error occurred' }
      }
    })
  })
})
