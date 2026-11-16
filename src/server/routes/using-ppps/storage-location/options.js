import Joi from 'joi'
import { getSession } from '#/server/common/helpers/get-session.js'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { storageLocationItemsFor, storageLocationValues } from './items.js'

const selectStorageLocation = 'Select which of your sites store PPPs'

export const app = {
  pageTitle: 'Which Of Your Sites Store PPPs'
}

export const validate = {
  payload: Joi.object({
    storageLocation: Joi.array()
      .items(Joi.string().valid(...storageLocationValues))
      .single()
      .unique()
      .min(1)
      .required()
  })
    .required()
    .messages({
      'any.required': selectStorageLocation,
      'any.only': selectStorageLocation,
      'array.base': selectStorageLocation,
      'array.min': selectStorageLocation,
      'array.unique': selectStorageLocation,
      'object.base': selectStorageLocation
    }),
  failAction: viewFailAction('using-ppps/storage-location/index', (request) => ({
    items: storageLocationItemsFor(getSession(request, 'formSession'))
  }))
}
