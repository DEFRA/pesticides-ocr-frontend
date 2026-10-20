import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { usingQuantityItems, usingQuantityValues } from './items.js'

const selectUsingQuantity = 'Select how much you use in a typical year'

export const app = {
  pageTitle: 'What quantity of PPPs or adjuvants do you use in a typical year?',
  items: usingQuantityItems
}

export const validate = {
  payload: Joi.object({
    quantity: Joi.string()
      .valid(...usingQuantityValues)
      .required()
      .messages({
        'any.only': selectUsingQuantity,
        'any.required': selectUsingQuantity,
        'string.base': selectUsingQuantity,
        'string.empty': selectUsingQuantity
      })
  }),
  failAction: viewFailAction('using-ppps/quantity/index')
}
