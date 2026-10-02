import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'
import { buildCodeViewContext, view } from './controller.js'

const enterCode = 'Enter the code'

export const app = {
  pageTitle: 'Check Your Email'
}

// The length depends on the backend's configured code length, which is held
// in session, so the controller checks it after this format check.
export const validate = {
  payload: Joi.object({
    code: Joi.string()
      .replace(/\s+/g, '')
      .pattern(/^\d+$/)
      .required()
      .messages({
        'string.empty': enterCode,
        'any.required': enterCode,
        'string.pattern.base': 'The code must only include numbers'
      })
  }),
  failAction: viewFailAction(view, buildCodeViewContext)
}
