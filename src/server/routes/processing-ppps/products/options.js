import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { processingProductsItems, processingProductsValues } from './items.js'

const SELECT_MESSAGE = 'Select what products you process'

export const app = {
  pageTitle: 'What products do you process in England, Scotland or Wales?',
  items: processingProductsItems
}

export const validate = {
  payload: Joi.object({
    products: Joi.string()
      .valid(...processingProductsValues)
      .required()
      .messages({
        'any.only': SELECT_MESSAGE,
        'any.required': SELECT_MESSAGE,
        'string.base': SELECT_MESSAGE,
        'string.empty': SELECT_MESSAGE
      })
  }),
  failAction: viewFailAction('processing-ppps/products/index')
}
