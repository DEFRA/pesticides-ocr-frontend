import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { addressFields } from '#/server/common/helpers/address-fields.js'
import { regionItems } from '#/server/common/constants/regions.js'
import { manualPageContext } from './controller.js'

const ENTER_ADDRESS_LINE_1_MESSAGE = "Enter the first line of your business' address"

export const app = {
  pageTitle: 'Main Site Address',
  items: regionItems
}

export const validate = {
  payload: Joi.object(addressFields({ addressLine1Message: ENTER_ADDRESS_LINE_1_MESSAGE })),
  failAction: viewFailAction('qualifying-questions/business-address/manual/index', manualPageContext)
}
