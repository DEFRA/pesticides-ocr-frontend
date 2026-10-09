// Case-officer calls to pesticides-ocr-backend, with the signed-in case
// officer's token forwarded as a bearer — the Entra ACCESS token
// in live mode (per Microsoft guidance: access tokens, not ID tokens, for API
// authorization), or the mock-identity token in mock mode.
//
// The API is exposed on the same app registration shared with this frontend, so
// we request its custom scope (api://<client-id>/access_as_user, via the plugin's
// additionalScopes / ENTRA_API_SCOPE) — that makes the access token's `aud` the
// app's own client id, which the backend validates, and it carries
// scp=access_as_user. This requires @defra/hapi-oidc-auth >= 0.4.0 to honour
// additionalScopes, so do not downgrade the dependency below it.

import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

// Throw a plain Error carrying an intended `.statusCode`, which the case-officer
// pages map to an error summary (and a 401 to re-authentication). An upstream
// failure (unreachable backend, non-JSON body, or a backend 5xx) is surfaced as
// 502 — we never fall through to an empty list, which would present "no
// results" as live truth.
export function backendError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

// Parse a JSON response body, converting a malformed/non-JSON body into the same
// contextual 502 the rest of this module raises, rather than a bare SyntaxError.
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

// The configured backend base URL. A missing value is a deployment (or local
// setup) misconfiguration, so fail loud rather than silently returning no data.
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

// GET a backend path with the forwarded token. Returns the raw Response so
// callers can distinguish 404 (missing resource) from real errors.
export async function backendGet(pathAndQuery, token, accept = 'application/json') {
  if (!token) {
    // A signed-in case officer with no forwardable token means a session/token
    // problem, not a routine miss — surface it as unauthorized rather than
    // sending an unauthenticated request the backend would 401 anyway.
    throw backendError(
      statusCodes.unauthorized,
      'No case-officer token to forward to the OCR backend'
    )
  }

  // backendBaseUrl() throws its own contextual 502 when unconfigured; keep it
  // out of the try so that specific message survives.
  const base = backendBaseUrl()

  let url
  try {
    url = new URL(pathAndQuery, base)
  } catch (cause) {
    // A malformed OCR_BACKEND_URL (e.g. missing scheme) — surface it as a
    // diagnosable 502 like every other config failure, not a bare TypeError/500.
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
