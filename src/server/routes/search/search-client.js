// The case-officer search and export APIs (EQ-442, EQ-366, EQ-369).

import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  backendError,
  backendGet,
  parseJson
} from '#/server/common/helpers/ocr-backend-client.js'

// Free-text search of registrations (backend GET /search?q=). A blank term
// matches everything. The backend returns stored registrations, so callers map
// them for display.
export async function fetchSearchResults({ query = '', token = '' } = {}) {
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
// A 404 is a genuine "not found" and maps to null (not an error). Anything else
// non-2xx throws with the upstream status — including a 400, which is how the
// backend rejects a malformed reference, so the search page can tell the
// officer the format is wrong rather than that nothing matched.
export async function fetchByReference(reference, token = '') {
  const res = await backendGet(
    `/search?reference=${encodeURIComponent(reference)}`,
    token
  )
  if (res.status === statusCodes.notFound) {
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

// Export one registration as CSV (backend GET /export?reference=). Returns the
// raw bytes rather than text: decoding would strip the UTF-8 BOM the backend
// adds so Excel reads accented names correctly. A reference that matches
// nothing is still a 200 with just the header row.
export async function fetchExport(reference, token = '') {
  const res = await backendGet(
    `/export?reference=${encodeURIComponent(reference)}`,
    token,
    'text/csv'
  )
  if (!res.ok) {
    throw backendError(
      res.status,
      `OCR backend GET /export?reference= returned ${res.status}`
    )
  }
  return Buffer.from(await res.arrayBuffer())
}
