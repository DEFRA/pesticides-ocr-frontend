import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { ukPostcode } from '#/server/common/helpers/address-fields.js'
import { searchPageContext } from './controller.js'

export const app = {
  pageTitle: 'Business Address'
}

export const validate = {
  payload: Joi.object({
    addressPostcode: ukPostcode,
    addressBuilding: Joi.string().trim().allow('')
  }),
  failAction: viewFailAction('qualifying-questions/business-address/index', searchPageContext)
}
