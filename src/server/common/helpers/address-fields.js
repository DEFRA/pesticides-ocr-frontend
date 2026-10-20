import Joi from 'joi'
import { regionValues } from '#/server/common/constants/regions.js'

const ENTER_POSTCODE_MESSAGE = 'Enter a postcode'
const ENTER_REAL_POSTCODE_MESSAGE = 'Enter a real postcode'
const ENTER_TOWN_MESSAGE = 'Enter town or city'
const SELECT_REGION_MESSAGE = 'Select a country'

// The backend's limit, so long input gets an error here rather than failing at submit.
const ADDRESS_MAX_LENGTH = 100
const ADDRESS_LINE_1_TOO_LONG_MESSAGE = 'Address line 1 must be 100 characters or less'
const ADDRESS_LINE_2_TOO_LONG_MESSAGE = 'Address line 2 must be 100 characters or less'
const TOWN_TOO_LONG_MESSAGE = 'Town or city must be 100 characters or less'

// A full UK postcode, with or without the space, in any case.
const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i

// Shared by the address search and every page that takes a typed-in address,
// so they all accept the same postcodes.
export const ukPostcode = Joi.string().trim().required().pattern(UK_POSTCODE).messages({
  'any.required': ENTER_POSTCODE_MESSAGE,
  'string.empty': ENTER_POSTCODE_MESSAGE,
  'string.pattern.base': ENTER_REAL_POSTCODE_MESSAGE
})

export const requiredText = (message) =>
  Joi.string().trim().required().messages({
    'any.required': message,
    'string.empty': message
  })

// The Joi rules for the fields the address-fields component renders. Spread
// them into a page's payload schema. Only the address line 1 message differs
// between pages, so the page passes it in.
export const addressFields = ({ addressLine1Message }) => ({
  addressLine1: requiredText(addressLine1Message).max(ADDRESS_MAX_LENGTH).messages({
    'string.max': ADDRESS_LINE_1_TOO_LONG_MESSAGE
  }),
  addressLine2: Joi.string().trim().allow('').max(ADDRESS_MAX_LENGTH).messages({
    'string.max': ADDRESS_LINE_2_TOO_LONG_MESSAGE
  }),
  addressTown: requiredText(ENTER_TOWN_MESSAGE).max(ADDRESS_MAX_LENGTH).messages({
    'string.max': TOWN_TOO_LONG_MESSAGE
  }),
  addressPostcode: ukPostcode,
  addressRegion: Joi.string()
    .valid(...regionValues)
    .required()
    .messages({
      'any.required': SELECT_REGION_MESSAGE,
      'any.only': SELECT_REGION_MESSAGE,
      'string.empty': SELECT_REGION_MESSAGE
    })
})
