import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  backendError,
  backendGet,
  parseJson
} from '#/server/common/helpers/ocr-backend-client.js'

export async function fetchJourneyMetrics(token) {
  const res = await backendGet('/metrics/journeys', token)
  if (!res.ok) {
    throw backendError(
      res.status,
      `OCR backend GET /metrics/journeys returned ${res.status}`
    )
  }
  const metrics = await parseJson(res, 'GET /metrics/journeys')
  if (!Array.isArray(metrics?.byMonth)) {
    throw backendError(
      statusCodes.badGateway,
      'OCR backend GET /metrics/journeys returned an unexpected body'
    )
  }
  return metrics
}
