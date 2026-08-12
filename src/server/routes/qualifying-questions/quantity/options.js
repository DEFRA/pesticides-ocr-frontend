import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'

export const app = {
  pageTitle: 'Quantity'
}

const numericRegex = /^\d+(\.\d+)?$/

const selectTypeMessage = 'Select how you want to give the quantity'

export const validate = {
  payload: Joi.object({
    'quantity-type': Joi.string().valid('amount', 'area').required().messages({
      'any.only': selectTypeMessage,
      'any.required': selectTypeMessage,
      'string.empty': selectTypeMessage
    }),
    'quantity-amount': Joi.when('quantity-type', {
      is: 'amount',
      then: Joi.string().trim().pattern(numericRegex).required().messages({
        'string.pattern.base': 'Enter a quantity in litres or kilograms, like 80000',
        'string.empty': 'Enter an estimated annual quantity',
        'any.required': 'Enter an estimated annual quantity'
      }),
      otherwise: Joi.any().strip()
    }),
    'quantity-area': Joi.when('quantity-type', {
      is: 'area',
      then: Joi.string().trim().pattern(numericRegex).required().messages({
        'string.pattern.base': 'Enter an area in hectares, like 250',
        'string.empty': 'Enter an estimated annual area covered',
        'any.required': 'Enter an estimated annual area covered'
      }),
      otherwise: Joi.any().strip()
    })
  }),
  failAction: viewFailAction('qualifying-questions/quantity/quantity')
}
