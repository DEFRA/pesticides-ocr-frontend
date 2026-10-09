import {
  backendError,
  backendGet,
  parseJson
} from '#/server/common/helpers/ocr-backend-client.js'

// The journey metrics summary (backend GET /metrics/journeys, EQ-472).
export async function fetchJourneyMetrics(token) {
  const res = await backendGet('/metrics/journeys', token)
  if (!res.ok) {
    throw backendError(
      res.status,
      `OCR backend GET /metrics/journeys returned ${res.status}`
    )
  }
  return parseJson(res, 'GET /metrics/journeys')
}
