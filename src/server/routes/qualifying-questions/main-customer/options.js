import Joi from 'joi'
import { viewFailAction } from '#/client/common/helpers/view-fail-action.js'
import { mainCustomerItems, mainCustomerValues } from './items.js'

const selectCustomerType = 'Select a customer type'

export const app = {
  pageTitle: 'Main Customer',
  items: mainCustomerItems
}

export const validate = {
  payload: Joi.object({
    mainCustomer: Joi.string().valid(...mainCustomerValues).required().messages({
      'any.required': selectCustomerType,
      'any.only': selectCustomerType,
      'string.base': selectCustomerType
    })
  }),
  failAction: viewFailAction('qualifying-questions/main-customer/main-customer')
}
