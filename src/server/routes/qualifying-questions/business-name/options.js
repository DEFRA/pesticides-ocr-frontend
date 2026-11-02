import Joi from 'joi'
import { requiredText } from '#/server/common/helpers/address-fields.js'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'

const ENTER_BUSINESS_NAME_MESSAGE = 'Enter a business name'

// The backend's limit, so a long name gets an error here rather than failing at submit.
const BUSINESS_NAME_MAX_LENGTH = 200

export const app = {
  pageTitle: 'Business Name'
}

export const validate = {
  payload: Joi.object({
    businessName: requiredText(ENTER_BUSINESS_NAME_MESSAGE).max(BUSINESS_NAME_MAX_LENGTH).messages({
      'string.max': 'Business or organisation name must be 200 characters or less'
    })
  }),
  failAction: viewFailAction('qualifying-questions/business-name/index')
}
