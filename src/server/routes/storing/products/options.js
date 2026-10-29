import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { storeProductsItems, storeProductsValues } from './items.js'

const SELECT_MESSAGE = 'Select what products you store'

export const app = {
  pageTitle: 'What products do you store in England, Scotland or Wales?',
  items: storeProductsItems
}

export const validate = {
  payload: Joi.object({
    products: Joi.string()
      .valid(...storeProductsValues)
      .required()
      .messages({
        'any.only': SELECT_MESSAGE,
        'any.required': SELECT_MESSAGE,
        'string.base': SELECT_MESSAGE,
        'string.empty': SELECT_MESSAGE
      })
  }),
  failAction: viewFailAction('storing/products/index')
}
