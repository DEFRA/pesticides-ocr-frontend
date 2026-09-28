import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'

import { config } from '#/config/config.js'
import {
  fetchSearchResults,
  fetchRegistrationByReference
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

describe('#fetchRegistrationByReference', () => {
  test('returns the registration on 200', async () => {
    const registration = { reference: 'OCR-1', businessName: 'Acme' }
    vi.mocked(fetch).mockResolvedValue(response(200, registration))

    expect(await fetchRegistrationByReference('OCR-1', TOKEN)).toEqual(registration)
    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url.toString()).toBe(`${BACKEND_URL}/search?reference=OCR-1`)
  })

  test('maps a 404 to null (genuine not-found, not an error)', async () => {
    vi.mocked(fetch).mockResolvedValue(response(404, { message: 'Not Found' }))

    expect(await fetchRegistrationByReference('OCR-nope', TOKEN)).toBeNull()
  })

  test('maps a 400 to null (a malformed reference matches nothing)', async () => {
    vi.mocked(fetch).mockResolvedValue(
      response(400, { message: 'Invalid reference number' })
    )

    expect(await fetchRegistrationByReference('not-a-reference', TOKEN)).toBeNull()
  })

  test('throws with the upstream status on other non-2xx responses', async () => {
    vi.mocked(fetch).mockResolvedValue(response(500, {}))

    await expect(
      fetchRegistrationByReference('OCR-1', TOKEN)
    ).rejects.toMatchObject({ statusCode: 500 })
  })

  test('encodes the reference into the query string', async () => {
    vi.mocked(fetch).mockResolvedValue(response(200, {}))

    await fetchRegistrationByReference('OCR/../secret', TOKEN)

    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(url.toString()).toBe(
      `${BACKEND_URL}/search?reference=OCR%2F..%2Fsecret`
    )
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
