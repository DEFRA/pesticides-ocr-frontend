import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'
import { addressActivityItems, addressActivityValues } from './items.js'

const selectAtLeastOne = 'Select at least one address activity'

export const app = {
  pageTitle: 'Address Activity',
  items: addressActivityItems
}

export const validate = {
  payload: Joi.object({
    addressActivities: Joi.array()
      .items(Joi.string().valid(...addressActivityValues))
      .single()
      .min(1)
      .required()
  }).required().messages({
    'any.required': selectAtLeastOne,
    'any.only': selectAtLeastOne,
    'array.min': selectAtLeastOne,
    'object.base': selectAtLeastOne
  }),
  failAction: viewFailAction('qualifying-questions/address-activity/address-activity')
}
