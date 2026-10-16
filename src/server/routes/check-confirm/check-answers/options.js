import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'

export const app = {
  pageTitle: 'Check Answers',
  hideBackLink: true
}

export const validate = {
  // TODO: Add validation for the check answers form
  payload: Joi.object({}).unknown(true).allow(null),
  failAction: viewFailAction('check-confirm/check-answers/index')
}

export const deleteAdditionalAddressValidate = {
  params: Joi.object({
    number: Joi.number().integer().min(1).required()
  })
}
