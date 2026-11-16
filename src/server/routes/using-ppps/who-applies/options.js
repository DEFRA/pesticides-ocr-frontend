import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { whoAppliesItems, whoAppliesValues } from './items.js'

const selectWhoApplies = 'Select who applies PPPs for your organisation'

export const app = {
  pageTitle: 'Who applies PPPs for your organisation?',
  items: whoAppliesItems
}

export const validate = {
  payload: Joi.object({
    whoApplies: Joi.string()
      .valid(...whoAppliesValues)
      .required()
      .messages({
        'any.only': selectWhoApplies,
        'any.required': selectWhoApplies,
        'string.base': selectWhoApplies,
        'string.empty': selectWhoApplies
      })
  }),
  failAction: viewFailAction('using-ppps/who-applies/index')
}
