import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'
import {
  additionalBusinessActivityItems,
  additionalBusinessActivityValues
} from './items.js'

const selectAtLeastOne = 'Select at least one address activity'

export const app = {
  pageTitle: 'Additional Business Activity',
  items: additionalBusinessActivityItems
}

export const validate = {
  payload: Joi.object({
    addressActivities: Joi.array()
      .items(Joi.string().valid(...additionalBusinessActivityValues))
      .single()
      .min(1)
      .required()
  })
    .required()
    .messages({
      'any.required': selectAtLeastOne,
      'any.only': selectAtLeastOne,
      'array.min': selectAtLeastOne,
      'object.base': selectAtLeastOne
    }),
  failAction: viewFailAction(
    'pro-users/additional-business-activity/additional-business-activity'
  )
}
