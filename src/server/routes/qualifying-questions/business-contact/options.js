import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'

const JOB_TITLE_MAX_LENGTH = 100
const JOB_TITLE_TOO_LONG_MESSAGE = 'Job title or role must be 100 characters or less'

export const app = {
  pageTitle: 'Business Contact'
}

export const validate = {
  payload: Joi.object({
    contactName: Joi.string().required().messages({
      'string.empty': 'Enter a contact name'
    }),
    contactJobTitle: Joi.string().trim().allow('').max(JOB_TITLE_MAX_LENGTH).messages({
      'string.max': JOB_TITLE_TOO_LONG_MESSAGE
    }),
    contactTelephone: Joi.string().trim().pattern(/^[0-9+()\- ]+$/).required().messages({
      'string.empty': 'Enter a telephone number',
      'string.pattern.base': 'Enter a valid telephone number'
    }),
    contactEmail: Joi.string().email().required().messages({
      'string.empty': 'Enter an email address',
      'string.email': 'Enter a valid email address'
    })
  }),
  failAction: viewFailAction('qualifying-questions/business-contact/index')
}
