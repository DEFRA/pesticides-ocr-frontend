import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { contactFields } from '#/server/common/helpers/contact-fields.js'
import { requiredText } from '#/server/common/helpers/address-fields.js'

const ENTER_BUSINESS_NAME_MESSAGE = 'Enter a business name'
const NAME_MAX_LENGTH = 100

export const app = {
  pageTitle: 'Who stores PPPs on your behalf?'
}

export const validate = {
  payload: Joi.object({
    ...contactFields(),
    businessName: requiredText(ENTER_BUSINESS_NAME_MESSAGE).max(NAME_MAX_LENGTH).messages({
      'string.max': 'Business name must be 100 characters or less'
    })
  }),
  failAction: viewFailAction('using-ppps/third-party-storage-contact/index')
}
