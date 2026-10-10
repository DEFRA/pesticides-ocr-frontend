// Case-officer calls to pesticides-ocr-backend, forwarding the officer's Entra
// access token. Requesting the API scope (ENTRA_API_SCOPE) needs
// @defra/hapi-oidc-auth >= 0.4.0, so don't downgrade it.

import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

// An Error carrying the status the page should act on. An unreachable backend
// or unreadable body is a 502, never an empty result shown as live truth.
export function backendError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

export async function parseJson(res, context) {
  try {
    return await res.json()
  } catch (cause) {
    throw backendError(
      statusCodes.badGateway,
      `OCR backend ${context} returned an unparseable body: ${cause.message}`
    )
  }
}

function backendBaseUrl() {
  const url = config.get('ocrBackend.url')
  if (!url) {
    throw backendError(
      statusCodes.badGateway,
      'OCR backend URL is not configured'
    )
  }
  return url
}

// Returns the raw Response, so callers can tell a 404 from other errors.
export async function backendGet(pathAndQuery, token, accept = 'application/json') {
  if (!token) {
    // No token is a session problem, so the officer signs in again.
    throw backendError(
      statusCodes.unauthorized,
      'No case-officer token to forward to the OCR backend'
    )
  }

  // Outside the try, so its own message isn't replaced.
  const base = backendBaseUrl()

  let url
  try {
    url = new URL(pathAndQuery, base)
  } catch (cause) {
    throw backendError(
      statusCodes.badGateway,
      `OCR backend URL is invalid: ${cause.message}`
    )
  }

  try {
    return await fetch(url, {
      headers: {
        authorization: `Bearer ${token}`,
        accept
      }
    })
  } catch (cause) {
    throw backendError(
      statusCodes.badGateway,
      `OCR backend request failed: ${cause.message}`
    )
  }
}
