import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetch } from 'undici'

import { config } from '#/config/config.js'
import {
  recordJourneyStart,
  recordJourneyNotEligible,
  recordOncePerSession
} from './journey-beacon.js'

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

describe('#journeyBeacon', () => {
  test('recordJourneyStart POSTs to /metrics/journey-starts', async () => {
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

  test('recordJourneyNotEligible POSTs to /metrics/journey-not-eligible', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 204 })

    await recordJourneyNotEligible(request)

    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, opts] = vi.mocked(fetch).mock.calls[0]
    expect(url.toString()).toBe(
      'https://ocr-backend.test/metrics/journey-not-eligible'
    )
    expect(opts.method).toBe('POST')
  })

  test('no-ops when the backend URL is not configured (local/mock)', async () => {
    config.set('ocrBackend.url', '')

    await recordJourneyStart(request)

    expect(fetch).not.toHaveBeenCalled()
    expect(request.logger.warn).not.toHaveBeenCalled()
  })

  test('warns when the backend responds non-2xx (still resolves)', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 500 })

    await expect(recordJourneyStart(request)).resolves.toBeUndefined()
    expect(request.logger.warn).toHaveBeenCalledTimes(1)
  })

  test('swallows a fetch failure and warns (never throws)', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(recordJourneyStart(request)).resolves.toBeUndefined()
    expect(request.logger.warn).toHaveBeenCalledTimes(1)
  })

  test('warns and does not fetch when the backend URL is invalid', async () => {
    config.set('ocrBackend.url', 'not-a-url')

    await recordJourneyNotEligible(request)

    expect(fetch).not.toHaveBeenCalled()
    expect(request.logger.warn).toHaveBeenCalledTimes(1)
  })
})

describe('#recordOncePerSession', () => {
  function fakeRequest(initial = {}) {
    const store = { ...initial }
    return {
      yar: {
        get: (key) => store[key],
        set: (key, value) => {
          store[key] = value
        }
      },
      logger: { info: vi.fn() }
    }
  }

  test('records once, sets the session flag, and logs', () => {
    const record = vi.fn()
    const req = fakeRequest()

    recordOncePerSession(req, {
      sessionKey: 'k',
      record,
      logMessage: 'msg'
    })

    expect(record).toHaveBeenCalledTimes(1)
    expect(record).toHaveBeenCalledWith(req)
    expect(req.yar.get('k')).toBe(true)
    expect(req.logger.info).toHaveBeenCalledWith('msg')
  })

  test('no-ops when the session flag is already set', () => {
    const record = vi.fn()
    const req = fakeRequest({ k: true })

    recordOncePerSession(req, { sessionKey: 'k', record, logMessage: 'msg' })

    expect(record).not.toHaveBeenCalled()
    expect(req.logger.info).not.toHaveBeenCalled()
  })
})
