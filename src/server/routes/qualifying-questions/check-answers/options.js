import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'

export const app = {
  pageTitle: 'Check Answers'
}

export const validate = {
  // Placeholder: replace with the real payload schema once the form fields are defined
  payload: Joi.object({}).unknown(true).allow(null),
  failAction: viewFailAction('qualifying-questions/check-answers/check-answers')
}
