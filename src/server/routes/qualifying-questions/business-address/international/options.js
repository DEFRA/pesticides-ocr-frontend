import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { internationalPageContext } from './controller.js'

const ENTER_ADDRESS_MESSAGE = 'Enter your main business address'
const ADDRESS_TOO_LONG_MESSAGE = 'Business address must be 500 characters or less'

const INTERNATIONAL_ADDRESS_MAX_LENGTH = 500

export const app = {
  pageTitle: 'What Is Your Main Business Address'
}

export const validate = {
  payload: Joi.object({
    internationalAddress: Joi.string()
      .trim()
      .max(INTERNATIONAL_ADDRESS_MAX_LENGTH)
      .required()
      .messages({
        'any.required': ENTER_ADDRESS_MESSAGE,
        'string.base': ENTER_ADDRESS_MESSAGE,
        'string.empty': ENTER_ADDRESS_MESSAGE,
        'string.max': ADDRESS_TOO_LONG_MESSAGE
      })
  }),
  failAction: viewFailAction(
    'qualifying-questions/business-address/international/index',
    internationalPageContext
  )
}
