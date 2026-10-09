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
  const isCount = (value) => Number.isInteger(value) && value >= 0
  const hasFigures = (value) =>
    value &&
    typeof value === 'object' &&
    ['starts', 'registrations', 'notEligible', 'finished', 'dropOuts'].every(
      (key) => isCount(value[key])
    ) &&
    (value.completionRate === null ||
      (Number.isFinite(value.completionRate) &&
        value.completionRate >= 0 &&
        value.completionRate <= 1))
  const hasValidMonth = (value) =>
    hasFigures(value) && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(value.month)

  if (
    !hasFigures(metrics) ||
    !Array.isArray(metrics.byMonth) ||
    !metrics.byMonth.every(hasValidMonth)
  ) {
    throw backendError(
      statusCodes.badGateway,
      'OCR backend GET /metrics/journeys returned an unexpected body'
    )
  }
  return metrics
}
