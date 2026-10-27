import { vi } from 'vitest'

import { config } from '#/config/config.js'

import {
  getCurrentEmailVerification,
  requestEmailVerification
} from '#/server/common/helpers/email-verification-client.js'

const MINUTE = 60_000
const LINK_TTL_MINUTES = 15

const isoIn = (milliseconds, now = Date.now()) => new Date(now + milliseconds).toISOString()

// What the client resolves with for the backend's 202 response. Test files that
// use these mock the client with
// vi.mock(import('#/server/common/helpers/email-verification-client.js')).
export const linkSent = ({ expiresInMinutes = LINK_TTL_MINUTES } = {}) => ({
  expiresAt: isoIn(expiresInMinutes * MINUTE),
  resendAvailableAt: isoIn(MINUTE)
})

// The backend's GET /email-verifications/current body for each status.
export function currentVerification(status) {
  if (status === 'none') {
    return { status }
  }
  return {
    status,
    expiresAt: isoIn(status === 'expired' ? -MINUTE : LINK_TTL_MINUTES * MINUTE),
    verifiedAt: status === 'verified' ? isoIn(0) : null,
    resendAvailableAt: isoIn(status === 'expired' ? -LINK_TTL_MINUTES * MINUTE : MINUTE)
  }
}

export const applicantError = (code, retryAfterSeconds) => ({ error: { code, retryAfterSeconds } })

// What verifyEmailToken resolves with for the backend's 200, and for its 4xx
// outcomes (TOKEN_INVALID, TOKEN_EXPIRED, TOKEN_SUPERSEDED, TOKEN_ALREADY_USED).
export const linkVerified = ({ sameJourney = true } = {}) => ({ sameJourney })

export const linkRejected = (code, { sameJourney = false } = {}) => ({ error: { code, sameJourney } })

export function mockEmailVerification({ status = 'verified' } = {}) {
  vi.mocked(requestEmailVerification).mockResolvedValue(linkSent())
  vi.mocked(getCurrentEmailVerification).mockResolvedValue(currentVerification(status))
}

// /register fails closed without a journey token, so a test that submits check
// answers needs the secret set. Call it inside a describe block.
export function useJourneyTokenSecret(secret = 'test-journey-secret') {
  let originalSecret

  beforeAll(() => {
    originalSecret = config.get('journeyToken.secret')
    config.set('journeyToken.secret', secret)
  })

  afterAll(() => {
    config.set('journeyToken.secret', originalSecret)
  })
}
