// Live-mode data access for the admin/enforcement UI (EQ-442): calls the
// pesticides-ocr-backend read API (EQ-385) with the signed-in case officer's
// Entra token forwarded as a bearer.
//
// The backend is a single Entra app registration shared with this frontend, so
// its configured audience is the frontend's own client id — which is the `aud`
// of the ID token. We therefore forward the ID token (session.idTokenHint); the
// access token would carry a Microsoft Graph audience and be rejected. If the
// backend later becomes a standalone API resource (its own App ID URI + scope),
// switch to a scoped access token here.

import { fetch } from 'undici'

import { config } from '#/config/config.js'
import { statusCodes } from '#/server/common/constants/status-codes.js'

// Throw a plain Error carrying an intended `.statusCode`; the shared catchAll
// handler recovers it and renders the matching error page (mirrors how
// @defra/hapi-oidc-auth surfaces its client errors). An upstream failure
// (unreachable backend, non-JSON body, or a backend 5xx) is surfaced as 502 so
// it renders the generic error page and is logged as a server error — we never
// fall through to an empty list, which would present "no operators" as live truth.
function backendError(statusCode, message) {
  const error = new Error(message)
  error.statusCode = statusCode
  return error
}

// Parse a JSON response body, converting a malformed/non-JSON body into the same
// contextual 502 the rest of this module raises, rather than a bare SyntaxError.
async function parseJson(res, context) {
  try {
    return await res.json()
  } catch (cause) {
    throw backendError(
      statusCodes.badGateway,
      `OCR backend ${context} returned an unparseable body: ${cause.message}`
    )
  }
}

// The configured backend base URL. A missing value on a live tier is a
// deployment misconfiguration, so fail loud rather than silently returning no
// data.
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
async function backendGet(pathAndQuery, token) {
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
        accept: 'application/json'
      }
    })
  } catch (cause) {
    throw backendError(
      statusCodes.badGateway,
      `OCR backend request failed: ${cause.message}`
    )
  }
}

// List/search operators (backend GET /operators[?search=]).
export async function fetchOperators({ query = '', token = '' } = {}) {
  const path = query
    ? `/operators?search=${encodeURIComponent(query)}`
    : '/operators'
  const res = await backendGet(path, token)
  if (!res.ok) {
    throw backendError(
      res.status,
      `OCR backend GET /operators returned ${res.status}`
    )
  }
  return parseJson(res, 'GET /operators')
}

// Fetch a single operator by reference (backend GET /operators/{reference}).
// A 404 is a genuine "not found" and maps to null (not an error).
export async function fetchOperatorByReference(reference, token = '') {
  const res = await backendGet(
    `/operators/${encodeURIComponent(reference)}`,
    token
  )
  if (res.status === statusCodes.notFound) {
    return null
  }
  if (!res.ok) {
    throw backendError(
      res.status,
      `OCR backend GET /operators/{reference} returned ${res.status}`
    )
  }
  return parseJson(res, 'GET /operators/{reference}')
}
