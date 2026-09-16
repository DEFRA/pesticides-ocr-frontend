import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'
import { businessActivityItems, businessActivityValues } from './items.js'

const selectAtLeastOne = 'Select at least one business activity'

export const app = {
  pageTitle: 'Business Activities',
  items: businessActivityItems
}

export const validate = {
  payload: Joi.object({
    businessActivities: Joi.array()
      .items(Joi.string().valid(...businessActivityValues))
      .single()
      .min(1)
      .required()
  }).required().messages({
    'any.required': selectAtLeastOne,
    'any.only': selectAtLeastOne,
    'array.min': selectAtLeastOne,
    'object.base': selectAtLeastOne
  }),
  failAction: viewFailAction('qualifying-questions/business-activities/business-activities')
}
