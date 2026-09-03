import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'
import { additionalAddressesItems, additionalAddressesValues } from './items.js'

const selectYesOrNo =
  'Select whether you need to add any additional business addresses'

export const app = {
  pageTitle: 'Additional Addresses',
  items: additionalAddressesItems
}

export const validate = {
  payload: Joi.object({
    additionalAddresses: Joi.string()
      .valid(...additionalAddressesValues)
      .required()
      .messages({
        'any.required': selectYesOrNo,
        'any.only': selectYesOrNo,
        'string.base': selectYesOrNo
      })
  }),
  failAction: viewFailAction('pro-users/additional-addresses/additional-addresses')
}
