import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { ukPostcode } from '#/server/common/helpers/address-fields.js'
import { searchPageContext } from './controller.js'

const BUILDING_MAX_LENGTH = 100
const BUILDING_TOO_LONG_MESSAGE = 'Building name or number must be 100 characters or less'

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
