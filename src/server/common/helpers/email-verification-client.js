// Applicant calls to the backend's magic-link email verification API. Each call
// carries this session's signed journey token, which is what the backend binds
// the verification to: it never returns an email address or an ID.

import { statusCodes } from '#/server/common/constants/status-codes.js'
import { getJourneyToken, TOKEN_HEADER } from './journey-beacon.js'
import { backendBaseUrl, backendError, errorBody, parseJson } from './ocr-backend-client.js'

// Errors the applicant can act on, so the page shows a message for them. The
// backend's `code` is stable; its `message` is not, so never branch on that.
const APPLICANT_ERROR_CODES = new Set([
  'VALIDATION_ERROR',
  'RESEND_COOLDOWN',
  'RATE_LIMITED',
  'EMAIL_SEND_FAILED'
])

const MS_PER_SECOND = 1000

// Retry-After is either a number of seconds or an HTTP date.
function retryAfterSeconds(response) {
  const header = response.headers.get('retry-after')
  if (!header) {
    return undefined
  }
  const seconds = Number(header)
  const milliseconds = Number.isFinite(seconds)
    ? seconds * MS_PER_SECOND
    : Date.parse(header) - Date.now()
  return Number.isNaN(milliseconds)
    ? undefined
    : Math.max(0, Math.ceil(milliseconds / MS_PER_SECOND))
}

const errorCode = async (response) => (await errorBody(response)).code

// A rejected journey token means the two services disagree on the secret, which
// the applicant can't fix, so it is a server error like any other failure here.
function unexpectedResponse(response, code, context) {
  const statusCode =
    response.status === statusCodes.serviceUnavailable
      ? statusCodes.serviceUnavailable
      : statusCodes.badGateway
  return backendError(
    statusCode,
    `OCR backend ${context} returned ${response.status}${code ? ` ${code}` : ''}`
  )
}

async function callBackend(request, path, options = {}, { journeyTokenOptional = false } = {}) {
  // The backend fails closed without a token, so don't send a doomed request.
  const token = getJourneyToken(request)
  if (!token && !journeyTokenOptional) {
    throw backendError(
      statusCodes.serviceUnavailable,
      'Email verification needs JOURNEY_TOKEN_SECRET, which is not configured'
    )
  }

  const base = backendBaseUrl()

  let url
  try {
    url = new URL(path, base)
  } catch (cause) {
    throw backendError(
      statusCodes.badGateway,
      `OCR backend URL is invalid: ${cause.message}`
    )
  }

  try {
    return await fetch(url, {
      ...options,
      headers: {
        accept: 'application/json',
        ...(token && { [TOKEN_HEADER]: token }),
        ...options.headers
      }
    })
  } catch (cause) {
    throw backendError(
      statusCodes.badGateway,
      `OCR backend email verification request failed: ${cause.message}`
    )
  }
}

// Sends a new link, superseding any earlier one, so it is also the resend.
// Resolves to `{ expiresAt, resendAvailableAt }`, or to `{ error: { code,
// retryAfterSeconds } }` for an error the applicant can act on.
export async function requestEmailVerification(request, email) {
  const context = 'email verification request'
  const response = await callBackend(request, '/email-verifications', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email })
  })

  if (response.status === statusCodes.accepted) {
    const { expiresAt, resendAvailableAt } = await parseJson(response, context)
    return { expiresAt, resendAvailableAt }
  }

  const code = await errorCode(response)
  if (APPLICANT_ERROR_CODES.has(code)) {
    return { error: { code, retryAfterSeconds: retryAfterSeconds(response) } }
  }
  throw unexpectedResponse(response, code, context)
}

// The state of this journey's latest link: `{ status, expiresAt, verifiedAt,
// resendAvailableAt }`, where status is none, pending, expired or verified.
export async function getCurrentEmailVerification(request) {
  const context = 'email verification status'
  const response = await callBackend(request, '/email-verifications/current')

  if (response.status !== statusCodes.ok) {
    throw unexpectedResponse(response, await errorCode(response), context)
  }
  return parseJson(response, context)
}

// The link outcomes the applicant gets a page for, by the status the backend
// sends each with. VERIFICATION_FAILED and anything else are server errors.
const VERIFY_ERROR_STATUSES = {
  TOKEN_INVALID: [statusCodes.badRequest, statusCodes.notFound],
  TOKEN_EXPIRED: [statusCodes.gone],
  TOKEN_SUPERSEDED: [statusCodes.gone],
  TOKEN_ALREADY_USED: [statusCodes.conflict]
}

// Uses up the link token, so call it only when the applicant presses Confirm,
// never when the link is opened (email scanners open links too). The journey
// token is optional: without it, or from another browser, the link still
// works, and `sameJourney` is false. Resolves to `{ sameJourney }`, or to
// `{ error: { code, sameJourney } }` for a link the applicant can't use.
export async function verifyEmailToken(request, token) {
  const context = 'email verification'
  const response = await callBackend(
    request,
    '/email-verifications/verify',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token })
    },
    { journeyTokenOptional: true }
  )

  if (response.status === statusCodes.ok) {
    const { outcome, sameJourney } = await parseJson(response, context)
    if (outcome !== 'VERIFIED') {
      throw backendError(statusCodes.badGateway, `OCR backend ${context} returned an unknown outcome: ${outcome}`)
    }
    return { sameJourney: sameJourney === true }
  }

  const { code, sameJourney } = await errorBody(response)
  if (VERIFY_ERROR_STATUSES[code]?.includes(response.status)) {
    return { error: { code, sameJourney: sameJourney === true } }
  }
  throw unexpectedResponse(response, code, context)
}
