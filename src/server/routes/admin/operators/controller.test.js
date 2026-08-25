import { createServer } from '#/server/server.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

// Complete a mock case-officer sign-in and return the authenticated session cookie.
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

describe('#adminOperators (EQ-227)', () => {
  let server
  let cookie

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
    cookie = await signInCaseOfficer(server)
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('redirects an unauthenticated visitor to the Entra sign-in', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/admin/operators'
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toContain('/auth/entra/sign-in')
  })

  test('lists registered operators for a signed-in case officer', async () => {
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/admin/operators',
      headers: { cookie }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(expect.stringContaining('Registered operators'))
    expect(result).toEqual(expect.stringContaining('Pesticides Ltd'))
  })

  test('filters the grid by the search query', async () => {
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/admin/operators?search=Green',
      headers: { cookie }
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(expect.stringContaining('Green Acres Growers'))
    expect(result).not.toEqual(expect.stringContaining('Pesticides Ltd'))
  })

  test('an over-length search is rejected and falls back to the unfiltered list', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: `/admin/operators?search=${'a'.repeat(101)}`,
      headers: { cookie }
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toBe('/admin/operators')
  })

  test('exports the (filtered) operators as a CSV download', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/admin/operators/export?search=Green',
      headers: { cookie }
    })

    expect(res.statusCode).toBe(statusCodes.ok)
    expect(res.headers['content-type']).toContain('text/csv')
    expect(res.headers['content-disposition']).toContain('attachment')
    expect(res.result).toContain('"Reference"')
    expect(res.result).toContain('"Green Acres Growers"')
  })

  test('export requires authentication', async () => {
    const { statusCode, headers } = await server.inject({
      method: 'GET',
      url: '/admin/operators/export'
    })

    expect(statusCode).toBe(statusCodes.redirect)
    expect(headers.location).toContain('/auth/entra/sign-in')
  })
})
