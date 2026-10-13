import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

import { config } from '#/config/config.js'
import { fetchSearchResults, fetchExport } from './search-client.js'

const fetch = vi.fn()
vi.stubGlobal('fetch', fetch)

const BACKEND_URL = 'https://ocr-backend.test'
const TOKEN = 'header.payload.signature'

// Minimal Response stand-in.
const response = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body
})

// Minimal CSV Response stand-in.
const csvResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  arrayBuffer: async () => new TextEncoder().encode(body).buffer
})

const originalUrl = config.get('ocrBackend.url')

beforeEach(() => {
  vi.mocked(fetch).mockReset()
  config.set('ocrBackend.url', BACKEND_URL)
})

afterEach(() => {
  config.set('ocrBackend.url', originalUrl)
})

describe('#fetchSearchResults', () => {
  const body = {
    data: [{ reference: 'OCR-1', businessName: 'Acme' }],
    pagination: { page: 2, pageSize: 10, totalRecords: 11, totalPages: 2 }
  }

  test('GETs /search for the term and page with the forwarded bearer token, returning the body', async () => {
    vi.mocked(fetch).mockResolvedValue(response(200, body))

    const result = await fetchSearchResults({
      query: 'acme',
      page: 2,
      token: TOKEN
    })

    expect(result).toEqual(body)
    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(url.toString()).toBe(`${BACKEND_URL}/search?q=acme&page=2`)
    expect(options.headers.authorization).toBe(`Bearer ${TOKEN}`)
    expect(options.headers.accept).toBe('application/json')
  })

  test('asks for the first page by default', async () => {
    vi.mocked(fetch).mockResolvedValue(response(200, body))

    await fetchSearchResults({ query: 'acme', token: TOKEN })

    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url.toString()).toBe(`${BACKEND_URL}/search?q=acme&page=1`)
  })

  test('encodes the search term into the query string', async () => {
    vi.mocked(fetch).mockResolvedValue(response(200, body))

    await fetchSearchResults({ query: 'green & *acres', token: TOKEN })

    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url.toString()).toBe(
      `${BACKEND_URL}/search?q=green%20%26%20*acres&page=1`
    )
  })

  test('throws with the upstream status on a non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue(response(403, { message: 'Forbidden' }))

    await expect(
      fetchSearchResults({ query: 'acme', token: TOKEN })
    ).rejects.toMatchObject({ statusCode: 403 })
  })

  test.each([
    ['a bare list', [{ reference: 'OCR-1' }]],
    ['no data list', { data: {}, pagination: body.pagination }],
    ['no pagination', { data: [] }],
    ['null', null]
  ])('throws 502 when a 2xx body is %s', async (_case, payload) => {
    vi.mocked(fetch).mockResolvedValue(response(200, payload))

    await expect(
      fetchSearchResults({ query: 'acme', token: TOKEN })
    ).rejects.toMatchObject({ statusCode: 502 })
  })
})

describe('#fetchExport', () => {
  test('GETs /export for the reference with the forwarded token, asking for CSV', async () => {
    vi.mocked(fetch).mockResolvedValue(csvResponse(200, '"Reference"'))

    await fetchExport('PPP-1A2-B3C', TOKEN)

    const [url, options] = vi.mocked(fetch).mock.calls[0]
    expect(url.toString()).toBe(`${BACKEND_URL}/export?reference=PPP-1A2-B3C`)
    expect(options.headers.authorization).toBe(`Bearer ${TOKEN}`)
    expect(options.headers.accept).toBe('text/csv')
  })

  test('returns the CSV bytes untouched, keeping the UTF-8 BOM', async () => {
    const csv = '\uFEFF"Reference"\r\n"PPP-1A2-B3C"'
    vi.mocked(fetch).mockResolvedValue(csvResponse(200, csv))

    const result = await fetchExport('PPP-1A2-B3C', TOKEN)

    expect(Buffer.isBuffer(result)).toBe(true)
    expect(result.equals(Buffer.from(csv, 'utf8'))).toBe(true)
  })

  test('throws with the upstream status on a non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue(csvResponse(400, 'Invalid reference'))

    await expect(fetchExport('PPP-1A2-B3C', TOKEN)).rejects.toMatchObject({
      statusCode: 400
    })
  })
})

describe('error handling', () => {
  test('throws 401 and does not call the backend when no token is forwarded', async () => {
    await expect(fetchSearchResults({ query: 'acme', token: '' })).rejects.toMatchObject({
      statusCode: 401
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws 502 when the backend URL is not configured', async () => {
    config.set('ocrBackend.url', '')

    await expect(fetchSearchResults({ query: 'acme', token: TOKEN })).rejects.toMatchObject({
      statusCode: 502
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws 502 when the backend is unreachable (network error)', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(fetchSearchResults({ query: 'acme', token: TOKEN })).rejects.toMatchObject({
      statusCode: 502
    })
  })

  test('throws 502 when a 2xx response carries a non-JSON body', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token < in JSON')
      }
    })

    await expect(fetchSearchResults({ query: 'acme', token: TOKEN })).rejects.toMatchObject({
      statusCode: 502
    })
  })

  test('throws 502 when the configured backend URL is malformed', async () => {
    config.set('ocrBackend.url', 'not-a-valid-url')

    await expect(fetchSearchResults({ query: 'acme', token: TOKEN })).rejects.toMatchObject({
      statusCode: 502
    })
    expect(fetch).not.toHaveBeenCalled()
  })
})
