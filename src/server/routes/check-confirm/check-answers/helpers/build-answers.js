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
    address['addressLine1'],
    address['addressLine2'],
    address['addressTown'],
    address['addressCounty'],
    address['addressPostcode']
  )
}

function additionalAddress(entry = {}) {
  return {
    address: addressLines(entry.address),
    contactName: toLines(entry.contact?.['contactName']),
    contactEmail: toLines(entry.contact?.['contactEmail']),
    contactTelephone: toLines(entry.contact?.['contactTelephone']),
    activity: labelsFor(additionalBusinessActivityItems, entry.activity)
  }
}

function quantityLines(quantity = {}) {
  const type = quantityTypeItems.find(
    (item) => item.value === quantity['quantityType']
  )

  if (!type || !quantity.quantity) {
    return []
  }

  return [`${quantity.quantity} ${type.unit}`]
}

export function buildAnswers(formData = {}) {
  const contact = formData['primary-contact'] ?? {}

  return {
    businessActivities: labelsFor(businessActivityItems, formData['businessActivities']),
    mainCustomer: labelsFor(mainCustomerItems, formData['mainCustomer']),
    businessName: toLines(formData['businessName']),
    address: addressLines(formData.address),
    contactName: toLines(contact['contactName']),
    contactTelephone: toLines(contact['contactTelephone']),
    contactEmail: toLines(contact['contactEmail']),
    addressActivities: labelsFor(addressActivityItems, formData['addressActivities']),
    quantity: quantityLines(formData.quantity),
    quantityType: formData.quantity?.['quantityType'],
    professionalSectors: labelsFor(professionalSectorsItems, formData['professionalSectors']),
    memberSchemes: labelsFor(memberSchemesItems, formData['memberSchemes']),
    additionalAddresses: (formData['additionalAddresses'] ?? []).map(additionalAddress)
  }
}
