import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'

const ENTER_POSTCODE_MESSAGE = 'Enter a postcode'
const ENTER_REAL_POSTCODE_MESSAGE = 'Enter a real postcode'

// A full UK postcode, with or without the space, in any case.
const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i

export const app = {
  pageTitle: 'Business Address'
}

export const validate = {
  payload: Joi.object({
    addressPostcode: Joi.string().trim().required().pattern(UK_POSTCODE).messages({
      'any.required': ENTER_POSTCODE_MESSAGE,
      'string.empty': ENTER_POSTCODE_MESSAGE,
      'string.pattern.base': ENTER_REAL_POSTCODE_MESSAGE
    }),
    addressBuilding: Joi.string().trim().allow('')
  }),
  failAction: viewFailAction('qualifying-questions/business-address/index')
}
