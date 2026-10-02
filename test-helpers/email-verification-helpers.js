import { vi } from 'vitest'

import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

export const verificationId = '66fa1b2c3d4e5f6a7b8c9d0e'

const FIVE_MINUTES_MS = 300000

export function backendResponse(status, body = {}) {
  return { status, json: async () => body }
}

export function startedResponse(overrides = {}) {
  return backendResponse(statusCodes.created, {
    verificationId,
    email: 'applicant@example.com',
    codeLength: 6,
    expiresAt: new Date(Date.now() + FIVE_MINUTES_MS).toISOString(),
    resendAllowedAt: new Date().toISOString(),
    ...overrides
  })
}

// Runs `action` with the backend answering `response`, then puts fetch and
// the backend URL back as they were.
async function withBackend(response, action) {
  const configuredBackendUrl = config.get('ocrBackend.url')
  if (!configuredBackendUrl) {
    config.set('ocrBackend.url', 'http://localhost:3001')
  }
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)

  try {
    return await action()
  } finally {
    fetchSpy.mockRestore()
    config.set('ocrBackend.url', configuredBackendUrl)
  }
}

// The session cookie a response set, or the one the request already had. yar
// only issues a cookie once something is written to the session.
function sessionCookie(response, cookie) {
  const [setCookie] = response.headers['set-cookie'] ?? []
  return setCookie ? setCookie.split(';')[0] : cookie
}

// Sends a code for applicant@example.com with the backend stubbed, leaving the
// session waiting for the code. Returns the session cookie.
export async function startEmailVerificationInSession(
  server,
  { cookie, started = startedResponse() } = {}
) {
  const response = await withBackend(started, () =>
    server.inject({
      method: 'POST',
      url: '/email-address',
      ...(cookie ? { headers: { cookie } } : {}),
      payload: { email: 'applicant@example.com' }
    })
  )
  return sessionCookie(response, cookie)
}

// Takes a session through the email verification pages with the backend
// stubbed, so tests of later pages (e.g. submission) start from a verified
// session. Returns the session cookie. Restores fetch afterwards, so call it
// before stubbing fetch in the test itself.
export async function verifyEmailInSession(server, existingCookie) {
  const cookie = await startEmailVerificationInSession(server, {
    cookie: existingCookie
  })

  await withBackend(backendResponse(statusCodes.ok, { verified: true }), () =>
    server.inject({
      method: 'POST',
      url: '/email-address/code',
      headers: { cookie },
      payload: { code: '123456' }
    })
  )
  return cookie
}
