import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { contactFields } from '#/server/common/helpers/contact-fields.js'

export const app = {
  pageTitle: 'Business Contact',
  // The first journey page. /start is outside the journey map, so the back
  // link can't be worked out from the answers.
  backLink: '/start'
}

export const validate = {
  payload: Joi.object(contactFields()),
  failAction: viewFailAction('qualifying-questions/business-contact/index')
}
