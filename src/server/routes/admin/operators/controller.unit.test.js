import { describe, test, expect, vi, beforeEach } from 'vitest'

// Unit-level coverage of the controller's session -> token wiring, isolated from
// the Hapi pipeline (the integration behaviour is covered in controller.test.js,
// which runs the whole server in mock mode). Here we mock the session read and
// the data layer so we can assert the exact token threaded through.
vi.mock('@defra/hapi-oidc-auth', () => ({
  getAuthSession: vi.fn(),
  PAGE_PATHS: { ENTRA_SIGN_IN: '/auth/entra/sign-in' }
}))
vi.mock('./operators-data.js', () => ({
  searchOperators: vi.fn(),
  toCsv: vi.fn()
}))

import { getAuthSession } from '@defra/hapi-oidc-auth'
import { searchOperators, toCsv } from './operators-data.js'
import { operatorsController, operatorsExportController } from './controller.js'

const TOKEN = 'header.payload.signature'

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getAuthSession).mockReturnValue({ token: TOKEN })
})

describe('operatorsController', () => {
  test('forwards session.token (and the search term) to searchOperators', async () => {
    const operators = [{ reference: 'OCR-1', businessName: 'Acme' }]
    vi.mocked(searchOperators).mockResolvedValue(operators)
    const h = { view: vi.fn().mockReturnValue('rendered') }
    const request = { query: { search: 'acme' } }

    const result = await operatorsController.handler(request, h)

    expect(getAuthSession).toHaveBeenCalledWith(request)
    expect(searchOperators).toHaveBeenCalledWith({
      query: 'acme',
      token: TOKEN
    })
    expect(h.view).toHaveBeenCalledWith('admin/operators/index', {
      operators,
      search: 'acme',
      total: 1
    })
    expect(result).toBe('rendered')
  })

  test('treats a missing search query as an empty string', async () => {
    vi.mocked(searchOperators).mockResolvedValue([])
    const h = { view: vi.fn().mockReturnValue('rendered') }

    await operatorsController.handler({ query: {} }, h)

    expect(searchOperators).toHaveBeenCalledWith({ query: '', token: TOKEN })
  })
})

describe('operatorsExportController', () => {
  test('forwards the same token and streams the CSV of the filtered view', async () => {
    const operators = [{ reference: 'OCR-1', businessName: 'Acme' }]
    vi.mocked(searchOperators).mockResolvedValue(operators)
    vi.mocked(toCsv).mockReturnValue('csv-body')
    const chained = {
      type: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis()
    }
    const h = { response: vi.fn().mockReturnValue(chained) }

    await operatorsExportController.handler({ query: { search: 'acme' } }, h)

    expect(searchOperators).toHaveBeenCalledWith({
      query: 'acme',
      token: TOKEN
    })
    expect(toCsv).toHaveBeenCalledWith(operators)
    expect(h.response).toHaveBeenCalledWith('csv-body')
    expect(chained.type).toHaveBeenCalledWith('text/csv')
    expect(chained.header).toHaveBeenCalledWith(
      'content-disposition',
      'attachment; filename="ocr-registered-operators.csv"'
    )
  })
})

describe('backend error handling', () => {
  const backendError = (statusCode) =>
    Object.assign(new Error(`backend ${statusCode}`), { statusCode })

  test('redirects to re-authenticate on a backend 401 (missing/expired token)', async () => {
    vi.mocked(searchOperators).mockRejectedValue(backendError(401))
    const h = { redirect: vi.fn().mockReturnValue('redirected'), view: vi.fn() }

    const result = await operatorsController.handler({ query: {} }, h)

    expect(h.redirect).toHaveBeenCalledWith(
      expect.stringContaining('/auth/entra/sign-in')
    )
    expect(h.view).not.toHaveBeenCalled()
    expect(result).toBe('redirected')
  })

  test('rethrows a non-401 backend error (e.g. 502) for the shared error page', async () => {
    vi.mocked(searchOperators).mockRejectedValue(backendError(502))
    const h = { redirect: vi.fn(), view: vi.fn() }

    await expect(
      operatorsController.handler({ query: {} }, h)
    ).rejects.toMatchObject({ statusCode: 502 })
    expect(h.redirect).not.toHaveBeenCalled()
  })

  test('export also redirects to re-authenticate on a backend 401', async () => {
    vi.mocked(searchOperators).mockRejectedValue(backendError(401))
    const h = { redirect: vi.fn().mockReturnValue('redirected'), response: vi.fn() }

    await operatorsExportController.handler({ query: {} }, h)

    expect(h.redirect).toHaveBeenCalledWith(
      expect.stringContaining('/auth/entra/sign-in')
    )
    expect(h.response).not.toHaveBeenCalled()
  })
})
