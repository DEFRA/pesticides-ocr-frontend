import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'

export const options = {
  options: {
    validate: {
      payload: Joi.object({
        'main-customer': Joi.string().required().messages({
          'any.required': 'Select a customer type',
          'string.base': 'Select a customer type'
        })
      }),
      failAction: viewFailAction('qualifying-questions/2-main-customer/main-customer')
    },
    app: {
      pageTitle: 'Main Customer'
    }
  }
}
