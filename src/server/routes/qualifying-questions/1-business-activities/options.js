import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'

export const options = {
  options: {
    validate: {
      payload: Joi.object({
        'business-activities': Joi.array().items(Joi.string()).single().min(1).required()
      }).required().messages({
        'any.required': 'Select at least one business activity',
        'object.base': 'Select at least one business activity'
      }),
      failAction: viewFailAction('qualifying-questions/1-business-activities/business-activities')
    },
    app: {
      pageTitle: 'Business Activities'
    }
  }
}
