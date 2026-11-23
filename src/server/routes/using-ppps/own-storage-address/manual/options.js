import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { addressFields } from '#/server/common/helpers/address-fields.js'
import { regionItems } from '#/server/common/constants/regions.js'
import { OWN_STORAGE_ADDRESS_HEADING } from '../lookup.js'
import { manualPageContext } from './controller.js'

const ENTER_ADDRESS_LINE_1_MESSAGE = 'Enter address line 1, typically the building and street'

export const app = {
  pageTitle: OWN_STORAGE_ADDRESS_HEADING,
  items: regionItems
}

export const validate = {
  payload: Joi.object(addressFields({ addressLine1Message: ENTER_ADDRESS_LINE_1_MESSAGE })),
  failAction: viewFailAction('using-ppps/own-storage-address/manual/index', manualPageContext)
}
