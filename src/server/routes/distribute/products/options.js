import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { distributeProductsItems, distributeProductsValues } from './items.js'

const SELECT_MESSAGE = 'Select what products you distribute'

export const app = {
  pageTitle: 'What products do you distribute in England, Scotland or Wales?',
  items: distributeProductsItems
}

export const validate = {
  payload: Joi.object({
    products: Joi.string()
      .valid(...distributeProductsValues)
      .required()
      .messages({
        'any.only': SELECT_MESSAGE,
        'any.required': SELECT_MESSAGE,
        'string.base': SELECT_MESSAGE,
        'string.empty': SELECT_MESSAGE
      })
  }),
  failAction: viewFailAction('distribute/products/index')
}
