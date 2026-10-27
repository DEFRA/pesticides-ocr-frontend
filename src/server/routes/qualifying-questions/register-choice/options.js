import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { registerChoiceItems, registerChoiceValues } from './items.js'

const selectAnOption = 'Select what you would like to do'

export const app = {
  pageTitle: 'What would you like to do?',
  backLink: '/',
  items: registerChoiceItems
}

export const validate = {
  payload: Joi.object({
    registerChoice: Joi.string().valid(...registerChoiceValues).required().messages({
      'any.required': selectAnOption,
      'any.only': selectAnOption,
      'string.base': selectAnOption
    })
  }),
  failAction: viewFailAction('qualifying-questions/register-choice/index')
}
