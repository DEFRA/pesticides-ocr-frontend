import { describe, test, expect, vi, beforeEach } from 'vitest'

// Unit-level coverage of the controller's session -> token wiring, search
// routing and error handling, isolated from the Hapi pipeline (the integration
// behaviour is covered in controller.test.js and
// controller.error-pipeline.test.js). Here we mock the session read and the
// data layer so we can assert the exact token and term threaded through.
vi.mock('@defra/hapi-oidc-auth', () => ({
  getAuthSession: vi.fn(),
  PAGE_PATHS: { ENTRA_SIGN_IN: '/auth/entra/sign-in' }
}))
vi.mock('./search-data.js', () => ({
  searchRegister: vi.fn()
}))
vi.mock('./search-client.js', () => ({
  fetchExport: vi.fn()
}))

import { getAuthSession } from '@defra/hapi-oidc-auth'
import { searchRegister } from './search-data.js'
import { fetchExport } from './search-client.js'
import { searchController, exportController } from './controller.js'

const TOKEN = 'header.payload.signature'

const logger = { error: vi.fn(), warn: vi.fn() }
const toolkit = () => {
  const response = {
    type: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis()
  }
  return {
    view: vi.fn().mockReturnValue({ code: vi.fn().mockReturnValue('coded') }),
    redirect: vi.fn().mockReturnValue('redirected'),
    response: vi.fn().mockReturnValue(response)
  }
}
const searchFor = (search, page = 1) => ({ query: { search, page }, logger })

const results = (operators, totals = {}) => ({
  operators,
  pagination: {
    page: 1,
    pageSize: 10,
    totalRecords: operators.length,
    totalPages: 1,
    ...totals
  }
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getAuthSession).mockReturnValue({ token: TOKEN })
})

describe('searchController', () => {
  test('renders just the form, without calling the API, when no term is given', async () => {
    const h = toolkit()

    await searchController.handler({ query: { page: 1 }, logger }, h)

    expect(searchRegister).not.toHaveBeenCalled()
    expect(h.view).toHaveBeenCalledWith(
      'search/index',
      expect.not.objectContaining({ operators: expect.anything() })
    )
  })

  test('searches for the term and page with the session token', async () => {
    const operators = [{ reference: 'PPP-1A2-B3C' }]
    vi.mocked(searchRegister).mockResolvedValue(results(operators))
    const h = toolkit()
    const request = searchFor('Norfolk', 2)

    await searchController.handler(request, h)

    expect(getAuthSession).toHaveBeenCalledWith(request)
    expect(searchRegister).toHaveBeenCalledWith({
      query: 'Norfolk',
      page: 2,
      token: TOKEN
    })
    expect(h.view).toHaveBeenCalledWith(
      'search/index',
      expect.objectContaining({ search: 'Norfolk', operators, totalRecords: 1 })
    )
  })

  test('a term in the reference format is searched like any other', async () => {
    vi.mocked(searchRegister).mockResolvedValue(results([]))
    const h = toolkit()

    await searchController.handler(searchFor('ppp-1a2-b3c'), h)

    expect(searchRegister).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'ppp-1a2-b3c' })
    )
  })

  test('passes page links when the results span pages', async () => {
    vi.mocked(searchRegister).mockResolvedValue(
      results([{ reference: 'PPP-1A2-B3C' }], {
        totalRecords: 11,
        totalPages: 2
      })
    )
    const h = toolkit()

    await searchController.handler(searchFor('Norfolk'), h)

    const [, context] = h.view.mock.calls[0]
    expect(context.totalRecords).toBe(11)
    expect(context.pagination.next.href).toBe('/search?search=Norfolk&page=2')
  })

  test('passes no page links when the results fit on one page', async () => {
    vi.mocked(searchRegister).mockResolvedValue(results([]))
    const h = toolkit()

    await searchController.handler(searchFor('Norfolk'), h)

    expect(h.view).toHaveBeenCalledWith(
      'search/index',
      expect.objectContaining({ operators: [], pagination: null })
    )
  })

  test('refuses to forward an ID token and re-authenticates', async () => {
    vi.mocked(getAuthSession).mockReturnValue({
      token: TOKEN,
      idTokenHint: TOKEN
    })
    const h = toolkit()

    const result = await searchController.handler(searchFor('PPP-1A2-B3C'), h)

    expect(searchRegister).not.toHaveBeenCalled()
    expect(h.redirect).toHaveBeenCalledWith(
      expect.stringContaining('/auth/entra/sign-in')
    )
    expect(h.view).not.toHaveBeenCalled()
    expect(result).toBe('redirected')
  })
})

describe('exportController', () => {
  test('exports the reference (upper-cased) with the session token as a CSV download', async () => {
    const csv = Buffer.from('"Reference"')
    vi.mocked(fetchExport).mockResolvedValue(csv)
    const h = toolkit()

    await exportController.handler(
      { query: { reference: 'ppp-1a2-b3c' }, logger },
      h
    )

    expect(fetchExport).toHaveBeenCalledWith('PPP-1A2-B3C', TOKEN)
    expect(h.response).toHaveBeenCalledWith(csv)
    const response = h.response.mock.results[0].value
    expect(response.type).toHaveBeenCalledWith('text/csv; charset=utf-8')
    expect(response.header).toHaveBeenCalledWith(
      'content-disposition',
      'attachment; filename="ocr-registration-PPP-1A2-B3C.csv"'
    )
  })

  test('does not call the API for a value that is not a reference', async () => {
    const h = toolkit()

    await exportController.handler(
      { query: { reference: 'not a reference' }, logger },
      h
    )

    expect(fetchExport).not.toHaveBeenCalled()
    expect(h.view).toHaveBeenCalledWith(
      'search/index',
      expect.objectContaining({ errorList: expect.any(Array) })
    )
  })
})

describe('backend error handling', () => {
  const backendError = (statusCode) =>
    Object.assign(new Error(`backend ${statusCode}`), { statusCode })

  test('redirects to re-authenticate on a backend 401 (missing/expired token)', async () => {
    vi.mocked(searchRegister).mockRejectedValue(backendError(401))
    const h = toolkit()

    const result = await searchController.handler(searchFor('PPP-1A2-B3C'), h)

    expect(h.redirect).toHaveBeenCalledWith(
      expect.stringContaining('/auth/entra/sign-in')
    )
    expect(h.view).not.toHaveBeenCalled()
    expect(result).toBe('redirected')
  })

  test('logs a backend 5xx as an error and keeps its status on the page', async () => {
    vi.mocked(searchRegister).mockRejectedValue(backendError(502))
    const h = toolkit()

    const result = await searchController.handler(searchFor('Norfolk'), h)

    expect(logger.error).toHaveBeenCalled()
    expect(h.view.mock.results[0].value.code).toHaveBeenCalledWith(502)
    expect(result).toBe('coded')
  })

  test('logs a backend 4xx as a warning', async () => {
    vi.mocked(searchRegister).mockRejectedValue(backendError(400))
    const h = toolkit()

    await searchController.handler(searchFor('PPP-1A2-B3C'), h)

    expect(logger.warn).toHaveBeenCalled()
    expect(logger.error).not.toHaveBeenCalled()
  })

  test('rethrows an error without a status (not from the API) for the shared error page', async () => {
    vi.mocked(searchRegister).mockRejectedValue(new TypeError('mapper bug'))
    const h = toolkit()

    await expect(
      searchController.handler(searchFor('PPP-1A2-B3C'), h)
    ).rejects.toThrow('mapper bug')
    expect(h.view).not.toHaveBeenCalled()
  })
})
