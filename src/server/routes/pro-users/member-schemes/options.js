import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'
import { memberSchemesItems } from './items.js'

export const app = {
  pageTitle: 'Member Schemes',
  items: memberSchemesItems
}

const selectSchemeOrOther =
  'Select a member scheme or describe your main type of work'

export const validate = {
  payload: Joi.object({
    memberSchemes: Joi.array()
      .single()
      .when('memberSchemesOther', {
        is: Joi.exist(),
        then: Joi.forbidden()
      })
      .messages({
        'any.unknown': selectSchemeOrOther
      }),
    memberSchemesOther: Joi.string()
      .trim()
      .max(100)
      .empty('')
      .messages({
        'string.max': 'Please use 100 characters or fewer'
      })
  }),
  failAction: viewFailAction('pro-users/member-schemes/member-schemes')
}
