import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { distributeSitesItems, distributeSitesValues } from './items.js'

const SELECT_MESSAGE = 'Select how many sites you distribute PPPs from'

export const app = {
  pageTitle: 'At how many sites do you distribute PPPs in Great Britain?',
  items: distributeSitesItems
}

export const validate = {
  payload: Joi.object({
    sites: Joi.string()
      .valid(...distributeSitesValues)
      .required()
      .messages({
        'any.only': SELECT_MESSAGE,
        'any.required': SELECT_MESSAGE,
        'string.base': SELECT_MESSAGE,
        'string.empty': SELECT_MESSAGE
      })
  }),
  failAction: viewFailAction('distribute/sites/index')
}
