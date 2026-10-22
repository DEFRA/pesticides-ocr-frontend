import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'

const ENTER_QUANTITY_MESSAGE = 'Enter the estimated annual quantity'
const QUANTITY_NOT_POSITIVE_MESSAGE = 'Estimated annual quantity must be a number greater than 0'

export const app = {
  pageTitle:
    'What is the overall volume of PPPs, ingredients and adjuvants your business processes in a typical year?'
}

export const validate = {
  payload: Joi.object({
    quantity: Joi.number().empty('').positive().required().messages({
      'any.required': ENTER_QUANTITY_MESSAGE,
      'number.base': QUANTITY_NOT_POSITIVE_MESSAGE,
      'number.positive': QUANTITY_NOT_POSITIVE_MESSAGE
    })
  }).messages({ 'any.required': ENTER_QUANTITY_MESSAGE }),
  failAction: viewFailAction('processing-ppps/quantity/index')
}
