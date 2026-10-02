import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'

const MAX_EMAIL = 254
const invalidEmail =
  'Enter an email address in the correct format, like name@example.com'

// Mirrors the backend's POST /email-verifications rules so users see a problem
// here rather than a backend rejection. Joi's .email() allows non-ASCII
// characters, which the backend does not accept.
const ASCII_EMAIL_PATTERN =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*$/

export const app = {
  pageTitle: 'Email Address'
}

export const validate = {
  payload: Joi.object({
    // max comes first so an over-long address gets the length message rather
    // than the format one (.email() also rejects long addresses).
    email: Joi.string()
      .trim()
      .max(MAX_EMAIL)
      .email()
      .pattern(ASCII_EMAIL_PATTERN)
      .required()
      .messages({
        'string.empty': 'Enter an email address',
        'any.required': 'Enter an email address',
        'string.email': invalidEmail,
        'string.pattern.base': invalidEmail,
        'string.max': 'Email address must be 254 characters or fewer'
      })
  }),
  failAction: viewFailAction('email-verification/email-address/email-address')
}
