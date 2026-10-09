import Joi from 'joi'

import { statusCodes } from '#/server/common/constants/status-codes.js'
import {
  backendError,
  backendGet,
  parseJson
} from '#/server/common/helpers/ocr-backend-client.js'

const count = Joi.number().integer().min(0).required()

const figures = {
  starts: count,
  registrations: count,
  notEligible: count,
  finished: count,
  dropOuts: count,
  completionRate: Joi.number().min(0).max(1).allow(null).required()
}

const metricsSchema = Joi.object({
  ...figures,
  byMonth: Joi.array()
    .items(
      Joi.object({
        month: Joi.string()
          .pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
          .required(),
        ...figures
      }).unknown()
    )
    .required()
}).unknown()

export async function fetchJourneyMetrics(token) {
  const res = await backendGet('/metrics/journeys', token)
  if (!res.ok) {
    throw backendError(
      res.status,
      `OCR backend GET /metrics/journeys returned ${res.status}`
    )
  }
  const metrics = await parseJson(res, 'GET /metrics/journeys')
  const { error } = metricsSchema.validate(metrics)
  if (error) {
    throw backendError(
      statusCodes.badGateway,
      `OCR backend GET /metrics/journeys returned an unexpected body: ${error.message}`
    )
  }
  return metrics
}
