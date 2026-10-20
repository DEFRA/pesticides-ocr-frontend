import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { searchPageContext } from './controller.js'

const ENTER_POSTCODE_MESSAGE = 'Enter a postcode'
const ENTER_REAL_POSTCODE_MESSAGE = 'Enter a real postcode'

const BUILDING_MAX_LENGTH = 100
const BUILDING_TOO_LONG_MESSAGE = 'Building name or number must be 100 characters or less'

// A full UK postcode, with or without the space, in any case.
const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i

// Shared with the manual address page (./manual), so both accept the same postcodes.
export const ukPostcode = Joi.string().trim().required().pattern(UK_POSTCODE).messages({
  'any.required': ENTER_POSTCODE_MESSAGE,
  'string.empty': ENTER_POSTCODE_MESSAGE,
  'string.pattern.base': ENTER_REAL_POSTCODE_MESSAGE
})

export const app = {
  pageTitle: 'Business Address'
}

export const validate = {
  payload: Joi.object({
    addressPostcode: ukPostcode,
    addressBuilding: Joi.string().trim().allow('').max(BUILDING_MAX_LENGTH).messages({
      'string.max': BUILDING_TOO_LONG_MESSAGE
    })
  }),
  failAction: viewFailAction('qualifying-questions/business-address/index', searchPageContext)
}
