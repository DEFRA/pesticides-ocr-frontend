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

const jsonResponse = (body, status = 200) =>
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
        { 'registration-reference': 'PP-ABC-123' },
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

    test.each(['PP-AB-123', 'PP-ABC-12', 'XX-ABC-123', 'PP-AB!-123', 'PPABC123'])(
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

    test('Should show the registration when the reference is found', async () => {
      fetchMock.mockResolvedValue(
        jsonResponse({ reference: 'PP-ABC-123', businessName: 'Pesticides Ltd' })
      )

      const { statusCode, result } = await postSearch({
        'registration-reference': 'PP-ABC-123'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3001/search',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ reference: 'PP-ABC-123' })
        })
      )
      expect(result).toEqual(expect.stringContaining('Registration PP-ABC-123'))
      expect(result).toEqual(expect.stringContaining('Pesticides Ltd'))
    })

    test('Should trim and uppercase the reference before searching', async () => {
      fetchMock.mockResolvedValue(jsonResponse({ reference: 'PP-ABC-123' }))

      const { statusCode, result } = await postSearch({
        'registration-reference': '  pp-abc-123 '
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:3001/search',
        expect.objectContaining({
          body: JSON.stringify({ reference: 'PP-ABC-123' })
        })
      )
      expect(result).toEqual(expect.stringContaining('value="PP-ABC-123"'))
    })

    test('Should show a not found message when the reference is not found', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 404))

      const { statusCode, result } = await postSearch({
        'registration-reference': 'PP-ZZZ-999'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('No registration found for PP-ZZZ-999')
      )
    })

    test('Should return the error page when the search API fails', async () => {
      fetchMock.mockResolvedValue(jsonResponse({}, 500))

      const { statusCode, result } = await postSearch({
        'registration-reference': 'PP-ABC-123'
      })

      expect(statusCode).toBe(502)
      expect(result).toEqual(expect.stringContaining('Something went wrong'))
    })
  })
})
