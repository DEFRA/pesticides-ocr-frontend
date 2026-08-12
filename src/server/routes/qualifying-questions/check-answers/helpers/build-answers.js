import { businessActivityItems } from '../../business-activities/items.js'
import { mainCustomerItems } from '../../main-customer/items.js'
import { addressActivityItems } from '../../address-activity/items.js'
import { quantityTypeItems } from '../../quantity/items.js'

function toLines(...values) {
  return values.filter((value) => value !== undefined && value !== '')
}

function labelsFor(items, values) {
  return [values ?? []]
    .flat()
    .map((value) => items.find((item) => item.value === value)?.text ?? value)
}

function addressLines(address = {}) {
  return toLines(
    address['address-line-1'],
    address['address-line-2'],
    address['address-town'],
    address['address-county'],
    address['address-postcode']
  )
}

function quantityLines(quantity = {}) {
  const type = quantityTypeItems.find(
    (item) => item.value === quantity['quantity-type']
  )

  if (!type || !quantity.quantity) {
    return []
  }

  return [`${quantity.quantity} ${type.unit}`]
}

export function buildAnswers(formData = {}) {
  const contact = formData['primary-contact'] ?? {}

  return {
    businessActivities: labelsFor(
      businessActivityItems,
      formData['business-activities']
    ),
    mainCustomer: labelsFor(mainCustomerItems, formData['main-customer']),
    businessName: toLines(formData['business-name']),
    address: addressLines(formData.address),
    contactName: toLines(contact['contact-name']),
    contactTelephone: toLines(contact['contact-telephone']),
    contactEmail: toLines(contact['contact-email']),
    addressActivities: labelsFor(
      addressActivityItems,
      formData['address-activities']
    ),
    quantity: quantityLines(formData.quantity)
  }
}
