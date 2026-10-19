import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { ukPostcode } from '../options.js'
import { manualPageContext } from './controller.js'
import { regionItems, regionValues } from './items.js'

const ENTER_ADDRESS_LINE_1_MESSAGE = "Enter the first line of your business' address"
const ENTER_TOWN_MESSAGE = 'Enter town or city'
const SELECT_REGION_MESSAGE = 'Select a country'

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
    addressLine1: requiredText(ENTER_ADDRESS_LINE_1_MESSAGE),
    addressLine2: Joi.string().trim().allow(''),
    addressTown: requiredText(ENTER_TOWN_MESSAGE),
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
