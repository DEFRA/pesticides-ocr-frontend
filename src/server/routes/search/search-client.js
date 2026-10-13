import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  backendError,
  backendGet,
  parseJson
} from '#/server/common/helpers/ocr-backend-client.js'

export async function fetchSearchResults({ query, page = 1, token = '' }) {
  const res = await backendGet(
    `/search?q=${encodeURIComponent(query)}&page=${page}`,
    token
  )
  if (!res.ok) {
    throw backendError(
      res.status,
      `OCR backend GET /search returned ${res.status}`
    )
  }
  const body = await parseJson(res, 'GET /search')
  if (!Array.isArray(body?.data) || !body.pagination) {
    throw backendError(
      statusCodes.badGateway,
      'OCR backend GET /search returned an unexpected body'
    )
  }
  return body
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
