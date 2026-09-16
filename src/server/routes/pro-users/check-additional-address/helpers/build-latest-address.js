import { additionalBusinessActivityItems } from '../../additional-business-activity/items.js'

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

export function buildLatestAddress(additionalAddresses = []) {
  const entry = additionalAddresses.at(-1)

  if (!entry) {
    return null
  }

  return {
    number: additionalAddresses.length,
    address: addressLines(entry.address),
    contactName: toLines(entry.contact?.['contactName']),
    contactEmail: toLines(entry.contact?.['contactEmail']),
    contactTelephone: toLines(entry.contact?.['contactTelephone']),
    activity: labelsFor(additionalBusinessActivityItems, entry.activity)
  }
}
