// Live-mode data access for the admin/enforcement UI (EQ-442): calls the
// pesticides-ocr-backend search API (EQ-366) with the signed-in case officer's
// Entra ACCESS token forwarded as a bearer (per Microsoft guidance: access
// tokens, not ID tokens, for API authorization).
//
// The API is exposed on the same app registration shared with this frontend, so
// we request its custom scope (api://<client-id>/access_as_user, via the plugin's
// additionalScopes / ENTRA_API_SCOPE) — that makes the access token's `aud` the
// app's own client id, which the backend validates, and it carries
// scp=access_as_user. This requires @defra/hapi-oidc-auth >= 0.4.0 to honour
// additionalScopes, so do not downgrade the dependency below it.

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

// List/search registrations (backend GET /search?q=). A blank term matches
// everything, which is what the unfiltered grid asks for. The backend returns
// stored registrations, so callers map them for display.
export async function fetchOperators({ query = '', token = '' } = {}) {
  const res = await backendGet(`/search?q=${encodeURIComponent(query)}`, token)
  if (!res.ok) {
    throw backendError(
      res.status,
      `OCR backend GET /search returned ${res.status}`
    )
  }
  const registrations = await parseJson(res, 'GET /search')
  // Callers map over the result, so anything but a list is an upstream fault,
  // surfaced like an unparseable body rather than as a TypeError 500.
  if (!Array.isArray(registrations)) {
    throw backendError(
      statusCodes.badGateway,
      'OCR backend GET /search returned a non-list body'
    )
  }
  return registrations
}

// Fetch a single registration by reference (backend GET /search?reference=).
// A 404 is a genuine "not found" and maps to null (not an error). So does a
// 400: the backend rejects a malformed reference before looking it up, and a
// malformed reference can't match a record either. `reference` is the only
// parameter sent, so a 400 here can only mean the reference was rejected.
export async function fetchOperatorByReference(reference, token = '') {
  const res = await backendGet(
    `/search?reference=${encodeURIComponent(reference)}`,
    token
  )
  if (
    res.status === statusCodes.notFound ||
    res.status === statusCodes.badRequest
  ) {
    return null
  }
  if (!res.ok) {
    throw backendError(
      res.status,
      `OCR backend GET /search?reference= returned ${res.status}`
    )
  }
  return parseJson(res, 'GET /search?reference=')
}
