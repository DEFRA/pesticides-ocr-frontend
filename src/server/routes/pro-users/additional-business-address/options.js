import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'

export const app = {
  pageTitle: 'Business Address'
}

export const validate = {
  payload: Joi.object({
    addressLine1: Joi.string().required().messages({
      'string.empty': 'Enter the first line of your business\' address'
    }),
    addressLine2: Joi.string().allow(''),
    addressTown: Joi.string().required().messages({
      'string.empty': 'Enter town or city'
    }),
    addressCounty: Joi.string().allow(''),
    addressPostcode: Joi.string().required().messages({
      'string.empty': 'Enter your postcode'
    })
  }),
  failAction: viewFailAction('pro-users/additional-business-address/additional-business-address')
}
