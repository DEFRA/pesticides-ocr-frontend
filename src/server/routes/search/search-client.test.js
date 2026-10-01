import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

import { config } from '#/config/config.js'
import {
  fetchSearchResults,
  fetchByReference,
  fetchExport
} from './search-client.js'

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
  test('GETs /search with the forwarded bearer token and returns the body', async () => {
    const registrations = [{ reference: 'OCR-1', businessName: 'Acme' }]
    vi.mocked(fetch).mockResolvedValue(response(200, registrations))

    const result = await fetchSearchResults({ token: TOKEN })

    expect(result).toEqual(registrations)
    const [url, options] = vi.mocked(fetch).mock.calls[0]
    // A blank term is sent explicitly: /search treats it as "match everything".
    expect(url.toString()).toBe(`${BACKEND_URL}/search?q=`)
    expect(options.headers.authorization).toBe(`Bearer ${TOKEN}`)
    expect(options.headers.accept).toBe('application/json')
  })

  test('encodes the search term into the query string', async () => {
    vi.mocked(fetch).mockResolvedValue(response(200, []))

    await fetchSearchResults({ query: 'green acres', token: TOKEN })

    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url.toString()).toBe(`${BACKEND_URL}/search?q=green%20acres`)
  })

  test('throws with the upstream status on a non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue(response(403, { message: 'Forbidden' }))

    await expect(fetchSearchResults({ token: TOKEN })).rejects.toMatchObject({
      statusCode: 403
    })
  })

  test('throws 502 when a 2xx response is not a list', async () => {
    vi.mocked(fetch).mockResolvedValue(response(200, { reference: 'OCR-1' }))

    await expect(fetchSearchResults({ token: TOKEN })).rejects.toMatchObject({
      statusCode: 502
    })
  })
})

describe('#fetchByReference', () => {
  test('returns the registration on 200', async () => {
    const registration = { reference: 'OCR-1', businessName: 'Acme' }
    vi.mocked(fetch).mockResolvedValue(response(200, registration))

    expect(await fetchByReference('OCR-1', TOKEN)).toEqual(registration)
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url.toString()).toBe(`${BACKEND_URL}/search?reference=OCR-1`)
  })

  test('maps a 404 to null (genuine not-found, not an error)', async () => {
    vi.mocked(fetch).mockResolvedValue(response(404, { message: 'Not Found' }))

    expect(await fetchByReference('OCR-nope', TOKEN)).toBeNull()
  })

  test('throws a 400 (malformed reference) rather than treating it as not-found', async () => {
    vi.mocked(fetch).mockResolvedValue(
      response(400, { message: 'Invalid reference number' })
    )

    await expect(
      fetchByReference('not-a-reference', TOKEN)
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  test('throws with the upstream status on other non-2xx responses', async () => {
    vi.mocked(fetch).mockResolvedValue(response(500, {}))

    await expect(
      fetchByReference('OCR-1', TOKEN)
    ).rejects.toMatchObject({ statusCode: 500 })
  })

  test('encodes the reference into the query string', async () => {
    vi.mocked(fetch).mockResolvedValue(response(200, {}))

    await fetchByReference('OCR/../secret', TOKEN)

    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url.toString()).toBe(
      `${BACKEND_URL}/search?reference=OCR%2F..%2Fsecret`
    )
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
    await expect(fetchSearchResults({ token: '' })).rejects.toMatchObject({
      statusCode: 401
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws 502 when the backend URL is not configured', async () => {
    config.set('ocrBackend.url', '')

    await expect(fetchSearchResults({ token: TOKEN })).rejects.toMatchObject({
      statusCode: 502
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('throws 502 when the backend is unreachable (network error)', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(fetchSearchResults({ token: TOKEN })).rejects.toMatchObject({
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

    await expect(fetchSearchResults({ token: TOKEN })).rejects.toMatchObject({
      statusCode: 502
    })
  })

  test('throws 502 when the configured backend URL is malformed', async () => {
    config.set('ocrBackend.url', 'not-a-valid-url')

    await expect(fetchSearchResults({ token: TOKEN })).rejects.toMatchObject({
      statusCode: 502
    })
    expect(fetch).not.toHaveBeenCalled()
  })
})
