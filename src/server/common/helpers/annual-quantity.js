import Joi from 'joi'

const ENTER_QUANTITY_MESSAGE = 'Enter the estimated annual quantity'
const QUANTITY_NOT_POSITIVE_MESSAGE = 'Estimated annual quantity must be a number greater than 0'
const QUANTITY_TOO_LARGE_MESSAGE =
  'Estimated annual quantity is too large. Check you have entered it correctly'
const QUANTITY_DECIMAL_PLACES_MESSAGE =
  'Estimated annual quantity must have no more than 2 decimal places'

// Joi's precision() would round the quantity when converting rather than
// reject it, so this checks the number of decimal places itself.
function hasAtMostTwoDecimalPlaces(value, helpers) {
  return Math.round(value * 100) / 100 === value ? value : helpers.error('number.decimalPlaces')
}

// The estimated annual quantity, in kilograms or litres, asked on the
// processing, distribute and storing quantity pages. Nothing but spaces counts
// as not answered.
export const annualQuantity = () =>
  Joi.number()
    .empty(Joi.string().allow('').pattern(/^\s*$/))
    .positive()
    .custom(hasAtMostTwoDecimalPlaces)
    .required()
    .messages({
      'any.required': ENTER_QUANTITY_MESSAGE,
      'number.base': QUANTITY_NOT_POSITIVE_MESSAGE,
      'number.positive': QUANTITY_NOT_POSITIVE_MESSAGE,
      'number.unsafe': QUANTITY_TOO_LARGE_MESSAGE,
      'number.decimalPlaces': QUANTITY_DECIMAL_PLACES_MESSAGE
    })

export const annualQuantityPayload = () =>
  Joi.object({ quantity: annualQuantity() }).messages({ 'any.required': ENTER_QUANTITY_MESSAGE })
