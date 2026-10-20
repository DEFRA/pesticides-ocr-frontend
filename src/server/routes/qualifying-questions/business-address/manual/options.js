import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { regionItems, regionValues } from '#/server/common/constants/regions.js'
import { ukPostcode } from '../options.js'
import { manualPageContext } from './controller.js'

const ENTER_ADDRESS_LINE_1_MESSAGE = "Enter the first line of your business' address"
const ENTER_TOWN_MESSAGE = 'Enter town or city'
const SELECT_REGION_MESSAGE = 'Select a country'

// The backend's limit, so long input gets an error here rather than failing at submit.
const ADDRESS_MAX_LENGTH = 100
const ADDRESS_LINE_1_TOO_LONG_MESSAGE = 'Address line 1 must be 100 characters or less'
const ADDRESS_LINE_2_TOO_LONG_MESSAGE = 'Address line 2 must be 100 characters or less'
const TOWN_TOO_LONG_MESSAGE = 'Town or city must be 100 characters or less'

const requiredText = (message) =>
  Joi.string().trim().required().messages({
    'any.required': message,
    'string.empty': message
  })

export const app = {
  pageTitle: 'Main Site Address',
  items: regionItems
}

export const validate = {
  payload: Joi.object({
    addressLine1: requiredText(ENTER_ADDRESS_LINE_1_MESSAGE).max(ADDRESS_MAX_LENGTH).messages({
      'string.max': ADDRESS_LINE_1_TOO_LONG_MESSAGE
    }),
    addressLine2: Joi.string().trim().allow('').max(ADDRESS_MAX_LENGTH).messages({
      'string.max': ADDRESS_LINE_2_TOO_LONG_MESSAGE
    }),
    addressTown: requiredText(ENTER_TOWN_MESSAGE).max(ADDRESS_MAX_LENGTH).messages({
      'string.max': TOWN_TOO_LONG_MESSAGE
    }),
    addressPostcode: ukPostcode,
    addressRegion: Joi.string()
      .valid(...regionValues)
      .required()
      .messages({
        'any.required': SELECT_REGION_MESSAGE,
        'any.only': SELECT_REGION_MESSAGE,
        'string.empty': SELECT_REGION_MESSAGE
      })
  }),
  failAction: viewFailAction('qualifying-questions/business-address/manual/index', manualPageContext)
}
