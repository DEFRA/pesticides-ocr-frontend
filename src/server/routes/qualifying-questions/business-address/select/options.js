import Joi from 'joi'
import { selectFailAction } from './helpers/select-page.js'

export const SELECT_ADDRESS_MESSAGE = 'Select an address'

export const app = {
  pageTitle: 'Select Address'
}

export const validate = {
  payload: Joi.object({
    address: Joi.string()
      .pattern(/^\d+$/)
      .required()
      .messages({
        'any.required': SELECT_ADDRESS_MESSAGE,
        'string.base': SELECT_ADDRESS_MESSAGE,
        'string.empty': SELECT_ADDRESS_MESSAGE,
        'string.pattern.base': SELECT_ADDRESS_MESSAGE
      })
  }),
  failAction: selectFailAction
}
