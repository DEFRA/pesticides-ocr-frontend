import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { memberSchemesItems, memberSchemesValues } from './items.js'

export const app = {
  pageTitle: 'Are you a member of any assurance schemes? (optional)',
  items: memberSchemesItems
}

const selectSchemeOrOther =
  'Select a member scheme or describe your main type of work'

export const validate = {
  payload: Joi.object({
    memberSchemes: Joi.array()
      .items(Joi.string().valid(...memberSchemesValues))
      .single()
      .unique()
      .when('memberSchemesOther', {
        is: Joi.exist(),
        then: Joi.forbidden()
      })
      .messages({
        'any.unknown': selectSchemeOrOther,
        'any.only': selectSchemeOrOther,
        'array.base': selectSchemeOrOther,
        'array.unique': selectSchemeOrOther
      }),
    memberSchemesOther: Joi.string()
      .trim()
      .max(100)
      .empty('')
      .messages({
        'string.max': 'Please use 100 characters or fewer'
      })
  }),
  failAction: viewFailAction('using-ppps/member-schemes/index')
}
