import { vi } from 'vitest'

import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  confirmEmailVerification,
  resendEmailVerification,
  startEmailVerification
} from './email-verification-client.js'

describe('#emailVerificationClient', () => {
  const backendUrl = 'http://localhost:3001'
  let configuredBackendUrl

  beforeEach(() => {
    configuredBackendUrl = config.get('ocrBackend.url')
    config.set('ocrBackend.url', backendUrl)
  })

  afterEach(() => {
    config.set('ocrBackend.url', configuredBackendUrl)
    vi.restoreAllMocks()
  })

  const stubBackend = (status, body = {}) =>
    vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue({ status, json: async () => body })

  test('Should start a verification with the email address', async () => {
    const fetchSpy = stubBackend(statusCodes.created, { verificationId: 'abc' })

    const result = await startEmailVerification('applicant@example.com')

    const [url, options] = fetchSpy.mock.lastCall
    expect(url.toString()).toBe(`${backendUrl}/email-verifications`)
    expect(options.method).toBe('POST')
    expect(options.headers['content-type']).toBe('application/json')
    expect(JSON.parse(options.body)).toEqual({ email: 'applicant@example.com' })
    expect(result).toEqual({
      status: statusCodes.created,
      body: { verificationId: 'abc' }
    })
  })

  test('Should confirm a code against the verification', async () => {
    const fetchSpy = stubBackend(statusCodes.ok, { verified: true })

    const result = await confirmEmailVerification('abc', '123456')

    const [url, options] = fetchSpy.mock.lastCall
    expect(url.toString()).toBe(`${backendUrl}/email-verifications/abc/confirm`)
    expect(JSON.parse(options.body)).toEqual({ code: '123456' })
    expect(result.body).toEqual({ verified: true })
  })

  test('Should resend a code without a request body', async () => {
    const fetchSpy = stubBackend(statusCodes.created)

    await resendEmailVerification('abc')

    const [url, options] = fetchSpy.mock.lastCall
    expect(url.toString()).toBe(`${backendUrl}/email-verifications/abc/resend`)
    expect(options.body).toBeUndefined()
  })

  test('Should resolve backend errors rather than throwing', async () => {
    stubBackend(statusCodes.tooManyRequests, { message: 'Too many' })

    const result = await startEmailVerification('applicant@example.com')

    expect(result).toEqual({
      status: statusCodes.tooManyRequests,
      body: { message: 'Too many' }
    })
  })

  test('Should throw a bad gateway when the backend URL is not configured', async () => {
    config.set('ocrBackend.url', '')

    await expect(
      startEmailVerification('applicant@example.com')
    ).rejects.toMatchObject({ statusCode: statusCodes.badGateway })
  })

  test('Should throw a bad gateway when the backend URL is invalid', async () => {
    config.set('ocrBackend.url', 'not a url')

    await expect(
      startEmailVerification('applicant@example.com')
    ).rejects.toMatchObject({
      statusCode: statusCodes.badGateway,
      message: expect.stringContaining('OCR backend URL is invalid')
    })
  })

  test('Should throw a bad gateway when the backend cannot be reached', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNREFUSED'))

    await expect(
      startEmailVerification('applicant@example.com')
    ).rejects.toMatchObject({
      statusCode: statusCodes.badGateway,
      message: expect.stringContaining('ECONNREFUSED')
    })
  })

  test('Should throw a bad gateway when the backend body is not JSON', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      status: statusCodes.ok,
      json: async () => {
        throw new SyntaxError('Unexpected token')
      }
    })

    await expect(
      confirmEmailVerification('abc', '123456')
    ).rejects.toMatchObject({
      statusCode: statusCodes.badGateway,
      message: expect.stringContaining('unparseable body')
    })
  })
})
