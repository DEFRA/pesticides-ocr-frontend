import { businessActivityItems } from '../../../qualifying-questions/business-activities/items.js'
import { addressActivityItems } from '../../../qualifying-questions/address-activity/items.js'
import { quantityTypeItems } from '../../../qualifying-questions/quantity/items.js'
import { memberSchemesItems } from '../../../pro-users/member-schemes/items.js'
import { whoAppliesItems } from '#/server/routes/using-ppps/who-applies/items.js'
import { pppSectorsItems } from '#/server/routes/using-ppps/ppp-sectors/items.js'
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
    contactJobTitle: toLines(contact['contactJobTitle']),
    contactTelephone: toLines(contact['contactTelephone']),
    contactEmail: toLines(contact['contactEmail']),
    whoApplies: labelsFor(whoAppliesItems, formData['whoApplies']),
    contractorName: toLines(formData.contractor?.['contractorName']),
    contractorAddress: addressLines(formData.contractor?.address),
    professionalSectors: labelsFor(pppSectorsItems, formData['professionalSectors']),
    addressActivities: labelsFor(addressActivityItems, formData['addressActivities']),
    quantity: quantityLines(formData.quantity),
    quantityType: formData.quantity?.['quantityType'],
    memberSchemes: memberSchemeLines(formData['memberSchemes']),
    additionalAddresses: (formData['additionalAddresses'] ?? []).map((entry) => withValues(additionalAddressLines(entry)))
  })
}
