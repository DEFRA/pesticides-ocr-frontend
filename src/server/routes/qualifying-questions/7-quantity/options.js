import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'

export const options = {
  options: {
    validate: {
      payload: Joi.object({
        quantity: Joi.string().trim().pattern(/^\d+(\.\d+)?$/).required().messages({
          'string.pattern.base': 'Enter a valid quantity',
          'string.empty': 'Enter a quantity'
        })
      }),
      failAction: viewFailAction('qualifying-questions/7-quantity/quantity')
    },
    app: {
      pageTitle: 'Quantity'
    }
  }
}
