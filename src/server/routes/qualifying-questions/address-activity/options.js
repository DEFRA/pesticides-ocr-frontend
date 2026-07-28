import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'

const selectAtLeastOne = 'Select at least one address activity'

export const options = {
  options: {
    validate: {
      payload: Joi.object({
        'address-activities': Joi.array().items(Joi.string()).single().min(1).required()
      }).required().messages({
        'any.required': selectAtLeastOne,
        'array.min': selectAtLeastOne,
        'object.base': selectAtLeastOne
      }),
      failAction: viewFailAction('qualifying-questions/address-activity/address-activity')
    },
    app: {
      pageTitle: 'Address Activity'
    }
  }
}
