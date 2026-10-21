import { businessActivityItems } from '../../../qualifying-questions/business-activities/items.js'
import { addressActivityItems } from '../../../qualifying-questions/address-activity/items.js'
import { memberSchemesItems } from '../../../pro-users/member-schemes/items.js'
import { whoAppliesItems } from '#/server/routes/using-ppps/who-applies/items.js'
import { pppSectorsItems } from '#/server/routes/using-ppps/ppp-sectors/items.js'
import { agriSubsectorsItems } from '#/server/routes/using-ppps/agri-subsectors/items.js'
import { amenitySubsectorsItems } from '#/server/routes/using-ppps/amenity-subsector/items.js'
import { hortiSubsectorsItems } from '#/server/routes/using-ppps/horti-subsector/items.js'
import { storingItems } from '#/server/routes/using-ppps/storing/items.js'
import { storageLocationItems } from '#/server/routes/using-ppps/storage-location/items.js'
import { usingQuantityText } from '#/server/routes/using-ppps/quantity/items.js'
import { getUsingPPPsAnswers } from '#/server/common/helpers/using-ppps-answers.js'
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

export function buildAnswers(formData = {}) {
  const contact = formData['primaryContact'] ?? {}
  const usingPPPs = getUsingPPPsAnswers(formData)

  return withValues({
    businessActivities: labelsFor(businessActivityItems, formData['businessActivities']),
    businessName: toLines(formData['businessName']),
    address: addressLines(formData.address),
    contactName: toLines(contact['contactName']),
    contactJobTitle: toLines(contact['contactJobTitle']),
    contactTelephone: toLines(contact['contactTelephone']),
    contactEmail: toLines(contact['contactEmail']),
    whoApplies: labelsFor(whoAppliesItems, usingPPPs['whoApplies']),
    contractorName: toLines(usingPPPs.contractor?.['contractorName']),
    contractorAddress: addressLines(usingPPPs.contractor?.address),
    professionalSectors: labelsFor(pppSectorsItems, usingPPPs['professionalSectors']),
    agriSubsectors: labelsFor(agriSubsectorsItems, usingPPPs['agriSubsectors']),
    amenitySubsectors: labelsFor(amenitySubsectorsItems, usingPPPs['amenitySubsectors']),
    hortiSubsectors: labelsFor(hortiSubsectorsItems, usingPPPs['hortiSubsectors']),
    storing: labelsFor(storingItems, usingPPPs['storing']),
    storageLocation: labelsFor(storageLocationItems, usingPPPs['storageLocation']),
    usingQuantity: toLines(usingQuantityText(usingPPPs['quantity'])),
    addressActivities: labelsFor(addressActivityItems, formData['addressActivities']),
    memberSchemes: memberSchemeLines(formData['memberSchemes']),
    additionalAddresses: (formData['additionalAddresses'] ?? []).map((entry) => withValues(additionalAddressLines(entry)))
  })
}
