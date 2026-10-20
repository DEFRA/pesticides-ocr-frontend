import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import {
  ONLY_STORING,
  businessActivityCheckboxItems,
  businessActivityValues
} from './items.js'

const selectAtLeastOne = 'Select at least one business activity'
const selectActivitiesOrOnlyStoring =
  "Select either your activities or 'Only storing PPPs for other businesses'"

// "Only storing" is an exclusive option. The checkboxes component unticks the
// others in the browser, but without JavaScript both can still be posted.
const onlyStoringOnItsOwn = (activities, helpers) =>
  activities.includes(ONLY_STORING) && activities.length > 1
    ? helpers.error('array.exclusive')
    : activities

export const app = {
  pageTitle: 'Business Activities',
  backLink: '/',
  items: businessActivityCheckboxItems
}

export const validate = {
  payload: Joi.object({
    businessActivities: Joi.array()
      .items(Joi.string().valid(...businessActivityValues))
      .single()
      .min(1)
      .required()
      .custom(onlyStoringOnItsOwn)
      .messages({ 'array.exclusive': selectActivitiesOrOnlyStoring })
  }).required().messages({
    'any.required': selectAtLeastOne,
    'any.only': selectAtLeastOne,
    'array.min': selectAtLeastOne,
    'object.base': selectAtLeastOne
  }),
  failAction: viewFailAction('qualifying-questions/business-activities/index')
}
