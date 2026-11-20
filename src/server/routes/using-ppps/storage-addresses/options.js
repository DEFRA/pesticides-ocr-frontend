import Joi from 'joi'
import { viewFailAction } from '#/server/common/helpers/view-fail-action.js'
import { storageAddressesPage } from '../own-storage-address/lookup.js'
import { storageAddressesContext } from './controller.js'
import { addAnotherItems, addAnotherValues } from './items.js'

const selectAddAnother = 'Select yes if you want to add another address'

export const app = {
  pageTitle: 'Additional Storage Addresses',
  items: addAnotherItems
}

export const validate = {
  payload: Joi.object({
    addAnother: Joi.string()
      .valid(...addAnotherValues)
      .required()
      .messages({
        'any.only': selectAddAnother,
        'any.required': selectAddAnother,
        'string.base': selectAddAnother,
        'string.empty': selectAddAnother
      })
  })
    .required()
    .messages({ 'object.base': selectAddAnother }),
  failAction: viewFailAction('using-ppps/storage-addresses/index', storageAddressesContext)
}

// The address number comes from a hidden field, so anything else just goes
// back to the list.
export const removeValidate = {
  payload: Joi.object({
    address: Joi.number().integer().min(1).required()
  }),
  failAction: (request, h) => h.redirect(storageAddressesPage(request)).takeover()
}
