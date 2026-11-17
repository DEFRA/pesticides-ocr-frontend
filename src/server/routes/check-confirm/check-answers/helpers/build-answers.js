import { businessActivityItems } from '../../../qualifying-questions/business-activities/items.js'
import { memberSchemesItems } from '#/server/routes/using-ppps/member-schemes/items.js'
import { whoAppliesItems } from '#/server/routes/using-ppps/who-applies/items.js'
import { pppSectorsItems } from '#/server/routes/using-ppps/ppp-sectors/items.js'
import { agriSubsectorsItems } from '#/server/routes/using-ppps/agri-subsectors/items.js'
import { amenitySubsectorsItems } from '#/server/routes/using-ppps/amenity-subsectors/items.js'
import { hortiSubsectorsItems } from '#/server/routes/using-ppps/horti-subsectors/items.js'
import { storingItems } from '#/server/routes/using-ppps/storing/items.js'
import { MAIN_ADDRESS } from '#/server/routes/using-ppps/storage-location/items.js'
import { usingQuantityText } from '#/server/routes/using-ppps/quantity/items.js'
import { getUsingPPPsAnswers } from '#/server/common/helpers/using-ppps-answers.js'
import { addressLines, labelsFor, toLines } from '#/server/common/helpers/answer-lines.js'

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

// Each place PPPs are stored, in the order the pages ask about them: the main
// business address, each other address, then the third party storing them.
function storeLocations(usingPPPs) {
  const contact = usingPPPs.storageContact
  const mainAddress = [usingPPPs['storageLocation'] ?? []].flat().includes(MAIN_ADDRESS)
    ? [{ lines: ['At the main business address'], href: '/using-ppps/storage-location?change=true' }]
    : []
  const otherAddresses = (usingPPPs['ownStorageAddresses'] ?? []).map((address) => ({
    lines: addressLines(address),
    href: '/using-ppps/storage-addresses?change=true'
  }))
  const thirdParty = contact
    ? [
        {
          lines: toLines(
            contact['contactName'],
            contact['contactJobTitle'],
            contact['businessName'],
            contact['contactTelephone'],
            contact['contactEmail']
          ),
          href: '/using-ppps/third-party-storage-contact?change=true'
        }
      ]
    : []

  return [...mainAddress, ...otherAddresses, ...thirdParty]
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
    memberSchemes: memberSchemeLines(usingPPPs['memberSchemes']),
    storing: labelsFor(storingItems, usingPPPs['storing']),
    storeLocations: storeLocations(usingPPPs),
    usingQuantity: toLines(usingQuantityText(usingPPPs['quantity']))
  })
}
