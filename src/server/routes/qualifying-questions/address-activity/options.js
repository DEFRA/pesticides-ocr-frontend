import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'

export const options = {
  options: {
    validate: {
      payload: Joi.object({
        'address-activities': Joi.array().items(Joi.string()).single().min(1).required()
      }).required().messages({
        'any.required': 'Select at least one address activity',
        'object.base': 'Select at least one address activity'
      }),
      failAction: viewFailAction('qualifying-questions/address-activity/address-activity')
    },
    app: {
      pageTitle: 'Address Activity'
    }
  }
}
