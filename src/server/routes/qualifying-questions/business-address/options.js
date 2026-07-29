import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'

export const app = {
  pageTitle: 'Business Address'
}

export const validate = {
  payload: Joi.object({
    'address-line-1': Joi.string().required().messages({
      'string.empty': 'Enter the first line of your business\' address'
    }),
    'address-line-2': Joi.string().allow(''),
    'address-town': Joi.string().required().messages({
      'string.empty': 'Enter town or city'
    }),
    'address-county': Joi.string().allow(''),
    'address-postcode': Joi.string().required().messages({
      'string.empty': 'Enter your postcode'
    })
  }),
  failAction: viewFailAction('qualifying-questions/business-address/business-address')
}
