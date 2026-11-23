import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { startItems, startValues } from './items.js'

const selectWhatToDo = 'Select what you would like to do'

export const app = {
  pageTitle: 'What Would You Like To Do',
  // Outside the journey map, so the back link can't be worked out from the answers.
  backLink: '/',
  items: startItems
}

export const validate = {
  payload: Joi.object({
    registrationChoice: Joi.string()
      .valid(...startValues)
      .required()
      .messages({
        'any.only': selectWhatToDo,
        'any.required': selectWhatToDo,
        'string.base': selectWhatToDo,
        'string.empty': selectWhatToDo
      })
  }),
  failAction: viewFailAction('qualifying-questions/start/index')
}
