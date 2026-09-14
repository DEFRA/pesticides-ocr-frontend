import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetch } from 'undici'

import { config } from '#/config/config.js'
import { recordJourneyStart } from './record-journey-start.js'

vi.mock('undici', () => ({ fetch: vi.fn() }))

const BACKEND_URL = 'https://ocr-backend.test'
const originalUrl = config.get('ocrBackend.url')
const request = { logger: { warn: vi.fn() } }

beforeEach(() => {
  vi.mocked(fetch).mockReset()
  request.logger.warn.mockReset()
  config.set('ocrBackend.url', BACKEND_URL)
})

afterEach(() => {
  config.set('ocrBackend.url', originalUrl)
})

describe('#recordJourneyStart', () => {
  test('POSTs to /metrics/journey-starts when the backend URL is configured', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 204 })

    await recordJourneyStart(request)

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, opts] = vi.mocked(fetch).mock.calls[0]
    expect(url.toString()).toBe(
      'https://ocr-backend.test/metrics/journey-starts'
    )
    expect(opts.method).toBe('POST')
    expect(request.logger.warn).not.toHaveBeenCalled()
  })

  test('no-ops when the backend URL is not configured (local/mock)', async () => {
    config.set('ocrBackend.url', '')

    await recordJourneyStart(request)

    expect(fetch).not.toHaveBeenCalled()
    expect(request.logger.warn).not.toHaveBeenCalled()
  })

  test('swallows a fetch failure and warns (never throws)', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(recordJourneyStart(request)).resolves.toBeUndefined()
    expect(request.logger.warn).toHaveBeenCalledTimes(1)
  })

  test('warns and does not fetch when the backend URL is invalid', async () => {
    config.set('ocrBackend.url', 'not-a-url')

    await recordJourneyStart(request)

    expect(fetch).not.toHaveBeenCalled()
    expect(request.logger.warn).toHaveBeenCalledTimes(1)
  })
})
