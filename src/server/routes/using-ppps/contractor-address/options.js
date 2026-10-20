import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { addressFields, requiredText } from '#/server/common/helpers/address-fields.js'
import { regionItems } from '#/server/common/helpers/regions.js'

const ENTER_CONTRACTOR_NAME_MESSAGE = 'Enter the business or company name'
const ENTER_ADDRESS_LINE_1_MESSAGE = 'Enter address line 1, typically the building and street'

export const app = {
  pageTitle: 'Who applies PPPs on your behalf?',
  items: regionItems
}

export const validate = {
  payload: Joi.object({
    contractorName: requiredText(ENTER_CONTRACTOR_NAME_MESSAGE),
    ...addressFields({ addressLine1Message: ENTER_ADDRESS_LINE_1_MESSAGE })
  }),
  failAction: viewFailAction('using-ppps/contractor-address/index')
}
