import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest'
import { createHmac } from 'node:crypto'

import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  getCurrentEmailVerification,
  requestEmailVerification,
  verifyEmailToken
} from './email-verification-client.js'

const fetch = vi.fn()
vi.stubGlobal('fetch', fetch)

const BACKEND_URL = 'https://ocr-backend.test'
const SECRET = 'shared-secret'
const originalUrl = config.get('ocrBackend.url')
const originalSecret = config.get('journeyToken.secret')

const sessionRequest = () => {
  const store = {}
  return {
    yar: {
      get: (key) => store[key],
      set: (key, value) => {
        store[key] = value
      }
    }
  }
}

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers }
  })

// The backend's Boom error shape, plus its stable `code`.
const boom = (statusCode, error, code, message, headers) =>
  json(statusCode, { statusCode, error, message, code }, headers)

const accepted = () =>
  json(statusCodes.accepted, {
    expiresAt: '2026-10-15T10:15:00.000Z',
    resendAvailableAt: '2026-10-15T10:01:00.000Z'
  })

beforeEach(() => {
  fetch.mockReset()
  config.set('ocrBackend.url', BACKEND_URL)
  config.set('journeyToken.secret', SECRET)
})

afterEach(() => {
  config.set('ocrBackend.url', originalUrl)
  config.set('journeyToken.secret', originalSecret)
})

describe('#requestEmailVerification', () => {
  test('Should POST the email with the signed journey token', async () => {
    fetch.mockResolvedValue(accepted())
    const request = sessionRequest()

    await requestEmailVerification(request, 'jo@example.com')

    const [url, options] = fetch.mock.calls[0]
    const [nonce, signature] = options.headers['x-journey-token'].split('.')
    expect(url.toString()).toBe(`${BACKEND_URL}/email-verifications`)
    expect(options.method).toBe('POST')
    expect(options.headers['content-type']).toBe('application/json')
    expect(JSON.parse(options.body)).toEqual({ email: 'jo@example.com' })
    expect(signature).toBe(createHmac('sha256', SECRET).update(nonce).digest('hex'))
    expect(options.headers['x-journey-token']).toBe(request.yar.get('journeyToken'))
  })

  test('Should reuse the session journey token on every call', async () => {
    fetch.mockImplementation(async () => accepted())
    const request = sessionRequest()

    await requestEmailVerification(request, 'jo@example.com')
    await requestEmailVerification(request, 'jo@example.com')

    const [first, second] = fetch.mock.calls.map(([, options]) => options.headers['x-journey-token'])
    expect(first).toBe(second)
  })

  test('Should resolve with the expiry and resend times', async () => {
    fetch.mockResolvedValue(accepted())

    await expect(requestEmailVerification(sessionRequest(), 'jo@example.com')).resolves.toEqual({
      expiresAt: '2026-10-15T10:15:00.000Z',
      resendAvailableAt: '2026-10-15T10:01:00.000Z'
    })
  })

  test.each([
    [statusCodes.badRequest, 'Bad Request', 'VALIDATION_ERROR', '"email" must be a valid email', {}, undefined],
    [statusCodes.tooManyRequests, 'Too Many Requests', 'RESEND_COOLDOWN', 'Wait before requesting another email', { 'retry-after': '42' }, 42],
    [statusCodes.tooManyRequests, 'Too Many Requests', 'RATE_LIMITED', 'Too many verification emails have been requested. Try again later.', { 'retry-after': '1800' }, 1800],
    [statusCodes.badGateway, 'Bad Gateway', 'EMAIL_SEND_FAILED', 'The email could not be sent', {}, undefined]
  ])('Should resolve a %i %s with code %s as an applicant error', async (status, error, code, message, headers, retryAfterSeconds) => {
    fetch.mockResolvedValue(boom(status, error, code, message, headers))

    await expect(requestEmailVerification(sessionRequest(), 'jo@example.com')).resolves.toEqual({
      error: { code, retryAfterSeconds }
    })
  })

  test('Should read a Retry-After given as an HTTP date', async () => {
    const retryAt = new Date(Date.now() + 120_000).toUTCString()
    fetch.mockResolvedValue(
      boom(statusCodes.tooManyRequests, 'Too Many Requests', 'RATE_LIMITED', 'Try again later.', { 'retry-after': retryAt })
    )

    const { error } = await requestEmailVerification(sessionRequest(), 'jo@example.com')

    expect(error.retryAfterSeconds).toBeGreaterThan(110)
    expect(error.retryAfterSeconds).toBeLessThanOrEqual(120)
  })

  test.each([
    [statusCodes.unauthorized, 'Unauthorized', 'JOURNEY_TOKEN_INVALID', statusCodes.badGateway],
    [statusCodes.serviceUnavailable, 'Service Unavailable', 'SERVICE_NOT_CONFIGURED', statusCodes.serviceUnavailable],
    [statusCodes.internalServerError, 'Internal Server Error', undefined, statusCodes.badGateway]
  ])('Should throw for a %i %s so the error page is shown', async (status, error, code, statusCode) => {
    fetch.mockResolvedValue(boom(status, error, code, 'An error occurred'))

    await expect(requestEmailVerification(sessionRequest(), 'jo@example.com')).rejects.toMatchObject({
      statusCode,
      message: expect.stringContaining(`returned ${status}`)
    })
  })

  test('Should throw a 502 for an unparseable success body', async () => {
    fetch.mockResolvedValue(new Response('not json', { status: statusCodes.accepted }))

    await expect(requestEmailVerification(sessionRequest(), 'jo@example.com')).rejects.toMatchObject({
      statusCode: statusCodes.badGateway
    })
  })

  test('Should throw a 502 when the backend is unreachable', async () => {
    fetch.mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(requestEmailVerification(sessionRequest(), 'jo@example.com')).rejects.toMatchObject({
      statusCode: statusCodes.badGateway,
      message: expect.stringContaining('ECONNREFUSED')
    })
  })

  test('Should throw a 503 without calling the backend when no journey token secret is set', async () => {
    config.set('journeyToken.secret', '')

    await expect(requestEmailVerification(sessionRequest(), 'jo@example.com')).rejects.toMatchObject({
      statusCode: statusCodes.serviceUnavailable
    })
    expect(fetch).not.toHaveBeenCalled()
  })

  test('Should throw a 502 when no backend URL is configured', async () => {
    config.set('ocrBackend.url', '')

    await expect(requestEmailVerification(sessionRequest(), 'jo@example.com')).rejects.toMatchObject({
      statusCode: statusCodes.badGateway
    })
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('#getCurrentEmailVerification', () => {
  const verified = {
    status: 'verified',
    expiresAt: '2026-10-15T10:15:00.000Z',
    verifiedAt: '2026-10-15T10:03:12.000Z',
    resendAvailableAt: '2026-10-15T10:01:00.000Z'
  }

  test('Should GET the current status with the journey token and resolve with it', async () => {
    fetch.mockResolvedValue(json(statusCodes.ok, verified))
    const request = sessionRequest()

    await expect(getCurrentEmailVerification(request)).resolves.toEqual(verified)

    const [url, options] = fetch.mock.calls[0]
    expect(url.toString()).toBe(`${BACKEND_URL}/email-verifications/current`)
    expect(options.method).toBeUndefined()
    expect(options.headers['x-journey-token']).toBe(request.yar.get('journeyToken'))
  })

  test('Should throw a 502 for a rejected journey token', async () => {
    fetch.mockResolvedValue(boom(statusCodes.unauthorized, 'Unauthorized', 'JOURNEY_TOKEN_INVALID', 'Invalid journey token'))

    await expect(getCurrentEmailVerification(sessionRequest())).rejects.toMatchObject({
      statusCode: statusCodes.badGateway,
      message: expect.stringContaining('JOURNEY_TOKEN_INVALID')
    })
  })
})

describe('#verifyEmailToken', () => {
  const TOKEN = 'a'.repeat(43)

  const verified = (sameJourney) => json(statusCodes.ok, { outcome: 'VERIFIED', sameJourney })

  test('Should POST the link token with the journey token', async () => {
    fetch.mockResolvedValue(verified(true))
    const request = sessionRequest()

    await verifyEmailToken(request, TOKEN)

    const [url, options] = fetch.mock.calls[0]
    expect(url.toString()).toBe(`${BACKEND_URL}/email-verifications/verify`)
    expect(options.method).toBe('POST')
    expect(options.headers['content-type']).toBe('application/json')
    expect(JSON.parse(options.body)).toEqual({ token: TOKEN })
    expect(options.headers['x-journey-token']).toBe(request.yar.get('journeyToken'))
  })

  test('Should still verify without a journey token when no secret is set', async () => {
    config.set('journeyToken.secret', '')
    fetch.mockResolvedValue(verified(false))

    await expect(verifyEmailToken(sessionRequest(), TOKEN)).resolves.toEqual({ sameJourney: false })

    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('x-journey-token')
  })

  test.each([true, false])('Should resolve with sameJourney %s', async (sameJourney) => {
    fetch.mockResolvedValue(verified(sameJourney))

    await expect(verifyEmailToken(sessionRequest(), TOKEN)).resolves.toEqual({ sameJourney })
  })

  test.each([
    [statusCodes.badRequest, 'Bad Request', 'TOKEN_INVALID'],
    [statusCodes.notFound, 'Not Found', 'TOKEN_INVALID'],
    [statusCodes.gone, 'Gone', 'TOKEN_EXPIRED'],
    [statusCodes.gone, 'Gone', 'TOKEN_SUPERSEDED']
  ])('Should resolve with the error for a %i %s', async (statusCode, error, code) => {
    fetch.mockResolvedValue(boom(statusCode, error, code, 'Link cannot be used'))

    await expect(verifyEmailToken(sessionRequest(), TOKEN)).resolves.toEqual({
      error: { code, sameJourney: false }
    })
  })

  test.each([true, false])('Should pass on sameJourney %s for a link already used', async (sameJourney) => {
    fetch.mockResolvedValue(
      json(statusCodes.conflict, {
        statusCode: statusCodes.conflict,
        error: 'Conflict',
        message: 'This link has already been used',
        code: 'TOKEN_ALREADY_USED',
        sameJourney
      })
    )

    await expect(verifyEmailToken(sessionRequest(), TOKEN)).resolves.toEqual({
      error: { code: 'TOKEN_ALREADY_USED', sameJourney }
    })
  })

  test('Should throw a 502 for VERIFICATION_FAILED', async () => {
    fetch.mockResolvedValue(
      boom(statusCodes.internalServerError, 'Internal Server Error', 'VERIFICATION_FAILED', 'An internal server error occurred')
    )

    await expect(verifyEmailToken(sessionRequest(), TOKEN)).rejects.toMatchObject({
      statusCode: statusCodes.badGateway,
      message: expect.stringContaining('VERIFICATION_FAILED')
    })
  })

  test('Should throw a 502 for a known code with an unexpected status', async () => {
    fetch.mockResolvedValue(boom(statusCodes.badRequest, 'Bad Request', 'TOKEN_EXPIRED', 'Link expired'))

    await expect(verifyEmailToken(sessionRequest(), TOKEN)).rejects.toMatchObject({
      statusCode: statusCodes.badGateway
    })
  })

  test('Should throw a 502 for an unknown success outcome', async () => {
    fetch.mockResolvedValue(json(statusCodes.ok, { outcome: 'PENDING', sameJourney: true }))

    await expect(verifyEmailToken(sessionRequest(), TOKEN)).rejects.toMatchObject({
      statusCode: statusCodes.badGateway,
      message: expect.stringContaining('PENDING')
    })
  })

  test('Should keep a 503 from the backend as a 503', async () => {
    fetch.mockResolvedValue(json(statusCodes.serviceUnavailable, {}))

    await expect(verifyEmailToken(sessionRequest(), TOKEN)).rejects.toMatchObject({
      statusCode: statusCodes.serviceUnavailable
    })
  })
})
