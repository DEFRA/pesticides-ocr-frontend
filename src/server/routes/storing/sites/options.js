import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { storeSitesItems, storeSitesValues } from './items.js'

const SELECT_MESSAGE = 'Select how many sites you store PPPs at'

export const app = {
  pageTitle: 'At how many sites do you store PPPs in Great Britain?',
  items: storeSitesItems
}

export const validate = {
  payload: Joi.object({
    sites: Joi.string()
      .valid(...storeSitesValues)
      .required()
      .messages({
        'any.only': SELECT_MESSAGE,
        'any.required': SELECT_MESSAGE,
        'string.base': SELECT_MESSAGE,
        'string.empty': SELECT_MESSAGE
      })
  }),
  failAction: viewFailAction('storing/sites/index')
}
