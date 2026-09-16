import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'

const ENTER_BUSINESS_NAME_MESSAGE = 'Enter a business name'

export const app = {
  pageTitle: 'Business Name'
}

export const validate = {
  payload: Joi.object({
    businessName: Joi.string().required().messages({
      'any.required': ENTER_BUSINESS_NAME_MESSAGE,
      'string.empty': ENTER_BUSINESS_NAME_MESSAGE
    })
  }),
  failAction: viewFailAction('qualifying-questions/business-name/business-name')
}
