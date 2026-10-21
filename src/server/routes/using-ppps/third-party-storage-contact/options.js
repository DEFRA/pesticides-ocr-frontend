import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { contactFields } from '#/server/common/helpers/contact-fields.js'

const ENTER_BUSINESS_NAME_MESSAGE = 'Enter a business name'

export const app = {
  pageTitle: 'Who stores PPPs on your behalf?'
}

export const validate = {
  payload: Joi.object({
    ...contactFields(),
    businessName: Joi.string().required().messages({
      'any.required': ENTER_BUSINESS_NAME_MESSAGE,
      'string.empty': ENTER_BUSINESS_NAME_MESSAGE
    })
  }),
  failAction: viewFailAction('using-ppps/third-party-storage-contact/index')
}
