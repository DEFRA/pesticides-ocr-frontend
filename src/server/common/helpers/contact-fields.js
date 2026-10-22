import Joi from 'joi'
import { requiredText } from '#/server/common/helpers/address-fields.js'

// The backend's limits, so long input gets an error here rather than failing at submit.
const NAME_MAX_LENGTH = 100
const JOB_TITLE_MAX_LENGTH = 100
const TELEPHONE_MAX_LENGTH = 20
const EMAIL_MAX_LENGTH = 254

// The Joi rules for a contact's name, job title, telephone and email, shared by
// the pages that ask for a contact (business contact, third-party storage).
export const contactFields = () => ({
  contactName: requiredText('Enter a contact name').max(NAME_MAX_LENGTH).messages({
    'string.max': 'Contact name must be 100 characters or less'
  }),
  contactJobTitle: Joi.string().trim().allow('').max(JOB_TITLE_MAX_LENGTH).messages({
    'string.max': 'Job title or role must be 100 characters or less'
  }),
  contactTelephone: Joi.string()
    .trim()
    .max(TELEPHONE_MAX_LENGTH)
    .pattern(/^[0-9+()\- ]+$/)
    .required()
    .messages({
      'string.empty': 'Enter a telephone number',
      'string.max': 'Telephone number must be 20 characters or less',
      'string.pattern.base': 'Enter a valid telephone number'
    }),
  contactEmail: Joi.string().max(EMAIL_MAX_LENGTH).email().required().messages({
    'string.empty': 'Enter an email address',
    'string.max': 'Email address must be 254 characters or less',
    'string.email': 'Enter a valid email address'
  })
})
