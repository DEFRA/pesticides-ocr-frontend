import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { STORES_NOTHING, storingItems, storingValues } from './items.js'

const selectStoring = 'Select where the products are stored'
const notStoringWithOthers =
  'Select where the products are stored, or select ‘We do not store PPPs’'

// "We do not store PPPs" is exclusive. JavaScript unticks the others, but
// without it they can still be posted together.
function notStoringAlone(storing, helpers) {
  return storing.includes(STORES_NOTHING) && storing.length > 1
    ? helpers.error('any.invalid')
    : storing
}

export const app = {
  pageTitle: 'Where Are The Products Stored',
  items: storingItems
}

export const validate = {
  payload: Joi.object({
    storing: Joi.array()
      .items(Joi.string().valid(...storingValues))
      .single()
      .unique()
      .min(1)
      .required()
      .custom(notStoringAlone)
  })
    .required()
    .messages({
      'any.required': selectStoring,
      'any.only': selectStoring,
      'any.invalid': notStoringWithOthers,
      'array.base': selectStoring,
      'array.min': selectStoring,
      'array.unique': selectStoring,
      'object.base': selectStoring
    }),
  failAction: viewFailAction('using-ppps/storing/index')
}
