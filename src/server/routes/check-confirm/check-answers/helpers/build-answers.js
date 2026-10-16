import { businessActivityItems } from '../../../qualifying-questions/business-activities/items.js'
import { addressActivityItems } from '../../../qualifying-questions/address-activity/items.js'
import { quantityTypeItems } from '../../../qualifying-questions/quantity/items.js'
import { professionalSectorsItems } from '../../../pro-users/professional-sectors/items.js'
import { memberSchemesItems } from '../../../pro-users/member-schemes/items.js'
import {
  additionalAddressLines,
  addressLines,
  labelsFor,
  toLines
} from '#/server/common/helpers/answer-lines.js'

function hasValue(value) {
  return Array.isArray(value) ? value.length > 0 : value !== undefined
}

function withValues(answers) {
  return Object.fromEntries(
    Object.entries(answers).filter(([, value]) => hasValue(value))
  )
}

function memberSchemeLines(memberSchemes) {
  if (memberSchemes === undefined) {
    return []
  }

  const labels = labelsFor(memberSchemesItems, memberSchemes)

  return labels.length > 0 ? labels : ['None']
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
  const contact = formData['primaryContact'] ?? {}

  return withValues({
    businessActivities: labelsFor(businessActivityItems, formData['businessActivities']),
    businessName: toLines(formData['businessName']),
    address: addressLines(formData.address),
    contactName: toLines(contact['contactName']),
    contactTelephone: toLines(contact['contactTelephone']),
    contactEmail: toLines(contact['contactEmail']),
    addressActivities: labelsFor(addressActivityItems, formData['addressActivities']),
    quantity: quantityLines(formData.quantity),
    quantityType: formData.quantity?.['quantityType'],
    professionalSectors: labelsFor(professionalSectorsItems, formData['professionalSectors']),
    memberSchemes: memberSchemeLines(formData['memberSchemes']),
    additionalAddresses: (formData['additionalAddresses'] ?? []).map((entry) => withValues(additionalAddressLines(entry)))
  })
}
