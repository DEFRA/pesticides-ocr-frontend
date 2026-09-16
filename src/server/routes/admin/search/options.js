import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'

export const app = {
  pageTitle: 'Search the register'
}

export const validate = {
  payload: Joi.object({
    'registration-reference': Joi.string()
      .trim()
      .uppercase()
      .pattern(/^PPP-[A-Z0-9]{3}-[A-Z0-9]{3}$/)
      .required()
      .messages({
        'any.required': 'Enter a registration reference number',
        'string.empty': 'Enter a registration reference number',
        'string.pattern.base': 'Enter a registration reference number in the correct format, like PPP-ABC-123'
      })
  }),
  failAction: viewFailAction('admin/search/index')
}
