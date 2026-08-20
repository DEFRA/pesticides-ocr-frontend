import { businessActivityItems } from '../../../qualifying-questions/business-activities/items.js'
import { mainCustomerItems } from '../../../qualifying-questions/main-customer/items.js'
import { addressActivityItems } from '../../../qualifying-questions/address-activity/items.js'
import { quantityTypeItems } from '../../../qualifying-questions/quantity/items.js'
import { professionalSectorsItems } from '../../../pro-users/professional-sectors/items.js'
import { memberSchemesItems } from '../../../pro-users/member-schemes/items.js'
import { additionalBusinessActivityItems } from '../../../pro-users/additional-business-activity/items.js'

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

function additionalAddress(entry = {}) {
  return {
    address: addressLines(entry.address),
    contactName: toLines(entry.contact?.['contact-name']),
    contactEmail: toLines(entry.contact?.['contact-email']),
    contactTelephone: toLines(entry.contact?.['contact-telephone']),
    activity: labelsFor(additionalBusinessActivityItems, entry.activity)
  }
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
    businessActivities: labelsFor(businessActivityItems, formData['business-activities']),
    mainCustomer: labelsFor(mainCustomerItems, formData['main-customer']),
    businessName: toLines(formData['business-name']),
    address: addressLines(formData.address),
    contactName: toLines(contact['contact-name']),
    contactTelephone: toLines(contact['contact-telephone']),
    contactEmail: toLines(contact['contact-email']),
    addressActivities: labelsFor(addressActivityItems, formData['address-activities']),
    quantity: quantityLines(formData.quantity),
    quantityType: formData.quantity?.['quantity-type'],
    professionalSectors: labelsFor(professionalSectorsItems, formData['professional-sectors']),
    memberSchemes: labelsFor(memberSchemesItems, formData['member-schemes']),
    additionalAddresses: (formData['additional-addresses'] ?? []).map(additionalAddress)
  }
}
