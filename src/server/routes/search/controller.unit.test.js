import { describe, test, expect, vi, beforeEach } from 'vitest'

// Unit-level coverage of the controller's session -> token wiring and error
// routing, isolated from the Hapi pipeline (the integration behaviour is covered
// in controller.test.js and controller.error-pipeline.test.js). Here we mock the
// session read and the data layer so we can assert the exact token threaded
// through.
vi.mock('@defra/hapi-oidc-auth', () => ({
  getAuthSession: vi.fn(),
  PAGE_PATHS: { ENTRA_SIGN_IN: '/auth/entra/sign-in' }
}))
vi.mock('./operators-data.js', () => ({
  getOperatorById: vi.fn()
}))

import { getAuthSession } from '@defra/hapi-oidc-auth'
import { getOperatorById } from './operators-data.js'
import { searchController } from './controller.js'

const TOKEN = 'header.payload.signature'

const logger = { error: vi.fn(), warn: vi.fn() }
const toolkit = () => ({
  view: vi.fn().mockReturnValue({ code: vi.fn().mockReturnValue('coded') }),
  redirect: vi.fn().mockReturnValue('redirected')
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getAuthSession).mockReturnValue({ token: TOKEN })
})

describe('searchController', () => {
  test('renders just the form, without calling the API, when no reference is given', async () => {
    const h = toolkit()

    await searchController.handler({ query: {}, logger }, h)

    expect(getOperatorById).not.toHaveBeenCalled()
    expect(h.view).toHaveBeenCalledWith('search/index', {})
  })

  test('forwards session.token (and the reference) to getOperatorById', async () => {
    const operator = { reference: 'PPP-1A2-B3C', businessName: 'Acme' }
    vi.mocked(getOperatorById).mockResolvedValue(operator)
    const h = toolkit()
    const request = { query: { reference: 'PPP-1A2-B3C' }, logger }

    await searchController.handler(request, h)

    expect(getAuthSession).toHaveBeenCalledWith(request)
    expect(getOperatorById).toHaveBeenCalledWith('PPP-1A2-B3C', TOKEN)
    expect(h.view).toHaveBeenCalledWith('search/index', {
      reference: 'PPP-1A2-B3C',
      operator,
      notFound: false
    })
  })

  test('flags notFound when the API finds nothing', async () => {
    vi.mocked(getOperatorById).mockResolvedValue(null)
    const h = toolkit()

    await searchController.handler(
      { query: { reference: 'PPP-000-000' }, logger },
      h
    )

    expect(h.view).toHaveBeenCalledWith(
      'search/index',
      expect.objectContaining({ operator: null, notFound: true })
    )
  })

  test('refuses to forward an ID token (plugin access-token fallback) and re-authenticates', async () => {
    // The plugin's `token: accessToken || idToken` fallback makes the forwarded
    // token identical to the ID token when the access token is absent — never
    // send that to the backend; bounce to re-authenticate for a fresh one.
    vi.mocked(getAuthSession).mockReturnValue({
      token: TOKEN,
      idTokenHint: TOKEN
    })
    const h = toolkit()

    const result = await searchController.handler(
      { query: { reference: 'PPP-1A2-B3C' }, logger },
      h
    )

    expect(getOperatorById).not.toHaveBeenCalled()
    expect(h.redirect).toHaveBeenCalledWith(
      expect.stringContaining('/auth/entra/sign-in')
    )
    expect(h.view).not.toHaveBeenCalled()
    expect(result).toBe('redirected')
  })
})

describe('backend error handling', () => {
  const backendError = (statusCode) =>
    Object.assign(new Error(`backend ${statusCode}`), { statusCode })

  test('redirects to re-authenticate on a backend 401 (missing/expired token)', async () => {
    vi.mocked(getOperatorById).mockRejectedValue(backendError(401))
    const h = toolkit()

    const result = await searchController.handler(
      { query: { reference: 'PPP-1A2-B3C' }, logger },
      h
    )

    expect(h.redirect).toHaveBeenCalledWith(
      expect.stringContaining('/auth/entra/sign-in')
    )
    expect(h.view).not.toHaveBeenCalled()
    expect(result).toBe('redirected')
  })

  test('logs a backend 5xx as an error and keeps its status on the page', async () => {
    vi.mocked(getOperatorById).mockRejectedValue(backendError(502))
    const h = toolkit()

    const result = await searchController.handler(
      { query: { reference: 'PPP-1A2-B3C' }, logger },
      h
    )

    expect(logger.error).toHaveBeenCalled()
    expect(h.view.mock.results[0].value.code).toHaveBeenCalledWith(502)
    expect(result).toBe('coded')
  })

  test('logs a backend 4xx as a warning', async () => {
    vi.mocked(getOperatorById).mockRejectedValue(backendError(400))
    const h = toolkit()

    await searchController.handler(
      { query: { reference: 'nope' }, logger },
      h
    )

    expect(logger.warn).toHaveBeenCalled()
    expect(logger.error).not.toHaveBeenCalled()
  })

  test('rethrows an error without a status (not from the API) for the shared error page', async () => {
    vi.mocked(getOperatorById).mockRejectedValue(new TypeError('mapper bug'))
    const h = toolkit()

    await expect(
      searchController.handler(
        { query: { reference: 'PPP-1A2-B3C' }, logger },
        h
      )
    ).rejects.toThrow('mapper bug')
    expect(h.view).not.toHaveBeenCalled()
  })
})
