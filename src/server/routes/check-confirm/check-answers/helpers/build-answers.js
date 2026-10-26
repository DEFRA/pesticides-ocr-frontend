import { businessActivityItems } from '../../../qualifying-questions/business-activities/items.js'
import { addressActivityItems } from '../../../qualifying-questions/address-activity/items.js'
import { memberSchemesItems } from '#/server/routes/using-ppps/member-schemes/items.js'
import { whoAppliesItems } from '#/server/routes/using-ppps/who-applies/items.js'
import { pppSectorsItems } from '#/server/routes/using-ppps/ppp-sectors/items.js'
import { agriSubsectorsItems } from '#/server/routes/using-ppps/agri-subsectors/items.js'
import { amenitySubsectorsItems } from '#/server/routes/using-ppps/amenity-subsectors/items.js'
import { hortiSubsectorsItems } from '#/server/routes/using-ppps/horti-subsectors/items.js'
import { storingItems } from '#/server/routes/using-ppps/storing/items.js'
import { storageLocationItems } from '#/server/routes/using-ppps/storage-location/items.js'
import { usingQuantityText } from '#/server/routes/using-ppps/quantity/items.js'
import { getUsingPPPsAnswers } from '#/server/common/helpers/using-ppps-answers.js'
import { getProcessingPPPsAnswers } from '#/server/common/helpers/processing-ppps-answers.js'
import { processingProductsItems } from '#/server/routes/processing-ppps/products/items.js'
import { processingSitesItems } from '#/server/routes/processing-ppps/sites/items.js'
import { getDistributePPPsAnswers } from '#/server/common/helpers/distribute-ppps-answers.js'
import { distributeProductsItems } from '#/server/routes/distribute/products/items.js'
import { distributeSitesItems } from '#/server/routes/distribute/sites/items.js'
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

// An estimated annual quantity, entered as a number of kilograms or litres.
const annualQuantityLines = (quantity) =>
  toLines(quantity === undefined ? undefined : `${quantity} kilograms or litres`)

export function buildAnswers(formData = {}) {
  const contact = formData['primaryContact'] ?? {}
  const usingPPPs = getUsingPPPsAnswers(formData)
  const processingPPPs = getProcessingPPPsAnswers(formData)
  const distributePPPs = getDistributePPPsAnswers(formData)

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
    memberSchemes: memberSchemeLines(usingPPPs['memberSchemes']),
    storing: labelsFor(storingItems, usingPPPs['storing']),
    storageLocation: labelsFor(storageLocationItems, usingPPPs['storageLocation']),
    ownStorageAddress: addressLines(usingPPPs['ownStorageAddress']),
    storageContactName: toLines(usingPPPs.storageContact?.['contactName']),
    storageBusinessName: toLines(usingPPPs.storageContact?.['businessName']),
    storageContactJobTitle: toLines(usingPPPs.storageContact?.['contactJobTitle']),
    storageContactTelephone: toLines(usingPPPs.storageContact?.['contactTelephone']),
    storageContactEmail: toLines(usingPPPs.storageContact?.['contactEmail']),
    usingQuantity: toLines(usingQuantityText(usingPPPs['quantity'])),
    processingProducts: labelsFor(processingProductsItems, processingPPPs['products']),
    processingSites: labelsFor(processingSitesItems, processingPPPs['sites']),
    processingQuantity: annualQuantityLines(processingPPPs['quantity']),
    distributeProducts: labelsFor(distributeProductsItems, distributePPPs['products']),
    distributeSites: labelsFor(distributeSitesItems, distributePPPs['sites']),
    distributeQuantity: annualQuantityLines(distributePPPs['quantity']),
    addressActivities: labelsFor(addressActivityItems, formData['addressActivities']),
    additionalAddresses: (formData['additionalAddresses'] ?? []).map((entry) => withValues(additionalAddressLines(entry)))
  })
}
