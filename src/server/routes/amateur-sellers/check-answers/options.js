import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'

export const app = {
  pageTitle: 'Check Answers'
}

export const validate = {
  // TODO: Add validation for the check answers form
  payload: Joi.object({}).unknown(true).allow(null),
  failAction: viewFailAction('amateur-sellers/check-answers/check-answers')
}
