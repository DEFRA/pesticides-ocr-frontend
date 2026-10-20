import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { storageLocationItems, storageLocationValues } from './items.js'

const selectStorageLocation = 'Select where you store the products you apply'

export const app = {
  pageTitle: 'Where do you store products you apply?',
  items: storageLocationItems
}

export const validate = {
  payload: Joi.object({
    storageLocation: Joi.string()
      .valid(...storageLocationValues)
      .required()
      .messages({
        'any.only': selectStorageLocation,
        'any.required': selectStorageLocation,
        'string.base': selectStorageLocation,
        'string.empty': selectStorageLocation
      })
  }),
  failAction: viewFailAction('using-ppps/storage-location/index')
}
