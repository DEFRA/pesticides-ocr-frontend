import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

async function signInCaseOfficer(server) {
  const start = await server.inject({ method: 'GET', url: '/auth/entra/start' })
  const startCookie = start.headers['set-cookie'][0].split(';')[0]
  const callback = await server.inject({
    method: 'GET',
    url: start.headers.location,
    headers: { cookie: startCookie }
  })
  const setCookie = callback.headers['set-cookie']
  return (setCookie ? setCookie[0] : startCookie).split(';')[0]
}

const jsonResponse = (body, status = statusCodes.ok) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  })

describe('#searchController', () => {
  let server
  let cookie
  let fetchMock

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    cookie = await signInCaseOfficer(server)
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

  describe('GET /admin/search', () => {
    test('Should redirect to sign in when not signed in', async () => {
      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/admin/search'
      })

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toContain('/auth/entra/sign-in')
    })

    test('Should return view', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/admin/search',
        headers: { cookie }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Search the register |'))
      expect(result).toEqual(
        expect.stringContaining('action="/admin/search"')
      )
    })
  })

  describe('POST /admin/search', () => {
    const postSearch = (payload, headers = { cookie }) =>
      server.inject({ method: 'POST', url: '/admin/search', payload, headers })

    test('Should redirect to sign in when not signed in', async () => {
      const { statusCode, headers } = await postSearch(
        { 'registration-reference': 'PPP-ABC-123' },
        {}
      )

      expect(statusCode).toBe(statusCodes.redirect)
      expect(headers.location).toContain('/auth/entra/sign-in')
      expect(fetchMock).not.toHaveBeenCalled()
    })

    test.each([{ 'registration-reference': '' }, {}])(
      'Should return view with an error message when the reference is missing',
      async (payload) => {
        const { statusCode, result } = await postSearch(payload)

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toEqual(expect.stringContaining('There is a problem'))
        expect(result).toEqual(
          expect.stringContaining('Enter a registration reference number')
        )
        expect(fetchMock).not.toHaveBeenCalled()
      }
    )

    // References are PPP-XXX-XXX; 'PP-ABC-123' is the near miss the hint text
    // used to suggest, so it is pinned here as invalid.
    test.each([
      'PP-ABC-123',
      'PPP-AB-123',
      'PPP-ABC-12',
      'XXX-ABC-123',
      'PPP-AB!-123',
      'PPPABC123'
    ])(
      'Should return view with an error message when the reference is %s',
      async (reference) => {
        const { statusCode, result } = await postSearch({
          'registration-reference': reference
        })

        expect(statusCode).toBe(statusCodes.ok)
        expect(result).toEqual(
          expect.stringContaining(
            'Enter a registration reference number in the correct format'
          )
        )
        expect(result).toEqual(expect.stringContaining(`value="${reference}"`))
        expect(fetchMock).not.toHaveBeenCalled()
      }
    )

    test('Should not call the search API when the reference is invalid and not signed in', async () => {
      const { result } = await postSearch(
        { 'registration-reference': 'bad' },
        {}
      )

      expect(result).not.toEqual(expect.stringContaining('Registration PP-'))
      expect(fetchMock).not.toHaveBeenCalled()
    })

    // The reference goes to the API as a query parameter on a GET, so read the
    // requested URL back rather than matching a request body.
    const searchedReference = () =>
      new URL(fetchMock.mock.lastCall[0]).searchParams.get('reference')

    test('Should show the registration when the reference is found', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({
          reference: 'PPP-ABC-123',
          businessName: 'Pesticides Ltd'
        })
      )

      const { statusCode, result } = await postSearch({
        'registration-reference': 'PPP-ABC-123'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(fetchMock.mock.lastCall[1]).toMatchObject({ method: 'GET' })
      expect(searchedReference()).toBe('PPP-ABC-123')
      expect(result).toEqual(
        expect.stringContaining('Registration details for PPP-ABC-123')
      )
      expect(result).toEqual(expect.stringContaining('Pesticides Ltd'))
    })

    test('Should trim and uppercase the reference before searching', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ reference: 'PPP-ABC-123' }))

      const { statusCode, result } = await postSearch({
        'registration-reference': '  ppp-abc-123 '
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(searchedReference()).toBe('PPP-ABC-123')
      expect(result).toEqual(expect.stringContaining('value="PPP-ABC-123"'))
    })

    test('Should show a not found message when the reference is not found', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, statusCodes.notFound))

      const { statusCode, result } = await postSearch({
        'registration-reference': 'PPP-ZZZ-999'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('No registration found')
      )
      expect(result).toEqual(
        expect.stringContaining(
          'There does not appear to be a registration matching PPP-ZZZ-999'
        )
      )
    })

    test('Should show the failure on the search page when the search API is unreachable', async () => {
      fetchMock.mockRejectedValue(new TypeError('fetch failed'))

      const { statusCode, result } = await postSearch({
        'registration-reference': 'PPP-ABC-123'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('There is a problem'))
    })

    test('Should show the reason on the search page when the search API rejects the request', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse(
          {
            statusCode: 400,
            error: 'Bad Request',
            message: 'Invalid reference number'
          },
          statusCodes.badRequest
        )
      )

      const { statusCode, result } = await postSearch({
        'registration-reference': 'PPP-ABC-123'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('There is a problem'))
      expect(result).toEqual(
        expect.stringContaining('Invalid reference number')
      )
    })

    test('Should show the failure on the search page when the search API errors', async () => {
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

      const { statusCode, result } = await postSearch({
        'registration-reference': 'PPP-ABC-123'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('There is a problem'))
      expect(result).toEqual(
        expect.stringContaining('An internal server error occurred')
      )
    })
  })
})
