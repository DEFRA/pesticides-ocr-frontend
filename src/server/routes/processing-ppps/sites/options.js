import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { processingSitesItems, processingSitesValues } from './items.js'

const SELECT_MESSAGE = 'Select how many sites you process PPPs at'

export const app = {
  pageTitle: 'At how many sites do you process PPPs in Great Britain?',
  items: processingSitesItems
}

export const validate = {
  payload: Joi.object({
    sites: Joi.string()
      .valid(...processingSitesValues)
      .required()
      .messages({
        'any.only': SELECT_MESSAGE,
        'any.required': SELECT_MESSAGE,
        'string.base': SELECT_MESSAGE,
        'string.empty': SELECT_MESSAGE
      })
  }),
  failAction: viewFailAction('processing-ppps/sites/index')
}
