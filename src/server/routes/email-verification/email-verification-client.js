// Calls the pesticides-ocr-backend email verification API (FE-445) for the
// applicant journey. The endpoints are public (applicants have no bearer
// token), so no authorization header is sent.
//
// Any HTTP response resolves to { status, body } so controllers can turn the
// backend's 4xx outcomes (wrong code, cooldown, rate limit) into form errors.
// Only an unusable backend (unconfigured, unreachable, or a non-JSON body)
// throws, as a 502 the shared catchAll renders as the error page.

import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

// Throw a plain Error carrying an intended `.statusCode`; catchAll recovers it
// (same approach as the admin operators client).
export function backendError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

function backendUrl(path) {
  const base = config.get('ocrBackend.url')
  if (!base) {
    throw backendError(
      statusCodes.badGateway,
      'OCR backend URL is not configured'
    )
  }

  try {
    return new URL(path, base)
  } catch (cause) {
    throw backendError(
      statusCodes.badGateway,
      `OCR backend URL is invalid: ${cause.message}`
    )
  }
}

async function backendPost(path, payload) {
  const url = backendUrl(path)
  const options = {
    method: 'POST',
    headers: { accept: 'application/json' }
  }
  if (payload) {
    options.headers['content-type'] = 'application/json'
    options.body = JSON.stringify(payload)
  }

  let response
  try {
    response = await fetch(url, options)
  } catch (cause) {
    throw backendError(
      statusCodes.badGateway,
      `OCR backend POST ${path} failed: ${cause.message}`
    )
  }

  try {
    return { status: response.status, body: await response.json() }
  } catch (cause) {
    throw backendError(
      statusCodes.badGateway,
      `OCR backend POST ${path} returned an unparseable body: ${cause.message}`
    )
  }
}

export function startEmailVerification(email) {
  return backendPost('/email-verifications', { email })
}

export function confirmEmailVerification(verificationId, code) {
  return backendPost(
    `/email-verifications/${encodeURIComponent(verificationId)}/confirm`,
    { code }
  )
}

export function resendEmailVerification(verificationId) {
  return backendPost(
    `/email-verifications/${encodeURIComponent(verificationId)}/resend`
  )
}
