import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'
import { checkAdditionalAddressItems, checkAdditionalAddressValues } from './items.js'
import { buildLatestAddress } from './helpers/build-latest-address.js'
import { getSession } from '#/server/common/helpers/get-session.js'

const selectYesOrNo = 'Select whether you want to add another address'

export const app = {
  pageTitle: 'Check Additional Address',
  items: checkAdditionalAddressItems
}

export const validate = {
  payload: Joi.object({
    'check-additional-address': Joi.string()
      .valid(...checkAdditionalAddressValues)
      .required()
      .messages({
        'any.required': selectYesOrNo,
        'any.only': selectYesOrNo,
        'string.base': selectYesOrNo
      })
  }),
  failAction: viewFailAction(
    'pro-users/check-additional-address/check-additional-address', (request) => ({
      address: buildLatestAddress(getSession(request, 'formSession')['additional-addresses'] ?? [])
    })
  )
}
