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
    'member-schemes': Joi.array()
      .single()
      .when('member-schemes-other', {
        is: Joi.exist(),
        then: Joi.forbidden()
      })
      .messages({
        'any.unknown': selectSchemeOrOther
      }),
    'member-schemes-other': Joi.string()
      .trim()
      .max(100)
      .empty('')
      .messages({
        'string.max': 'Please use 100 characters or fewer'
      })
  }),
  failAction: viewFailAction('pro-users/member-schemes/member-schemes')
}
