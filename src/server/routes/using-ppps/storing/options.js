import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { storingItems, storingValues } from './items.js'

const selectStoring = 'Select if you store the products you apply'

export const app = {
  pageTitle: 'Do you store products you apply?',
  items: storingItems
}

export const validate = {
  payload: Joi.object({
    storing: Joi.string()
      .valid(...storingValues)
      .required()
      .messages({
        'any.only': selectStoring,
        'any.required': selectStoring,
        'string.base': selectStoring,
        'string.empty': selectStoring
      })
  }),
  failAction: viewFailAction('using-ppps/storing/index')
}
