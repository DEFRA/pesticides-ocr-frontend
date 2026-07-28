import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'

export const options = {
  options: {
    validate: {
      payload: Joi.object({
        'contact-name': Joi.string().required().messages({
          'string.empty': 'Enter a contact name'
        }),
        'contact-telephone': Joi.string().trim().pattern(/^[0-9+()\- ]+$/).required().messages({
          'string.empty': 'Enter a telephone number',
          'string.pattern.base': 'Enter a valid telephone number'
        }),
        'contact-email': Joi.string().email().required().messages({
          'string.empty': 'Enter an email address',
          'string.email': 'Enter a valid email address'
        })
      }),
      failAction: viewFailAction('qualifying-questions/business-contact/business-contact')
    },
    app: {
      pageTitle: 'Business Contact'
    }
  }
}
