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
    address['address-line-1'],
    address['address-line-2'],
    address['address-town'],
    address['address-county'],
    address['address-postcode']
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
    contactName: toLines(entry.contact?.['contact-name']),
    contactEmail: toLines(entry.contact?.['contact-email']),
    contactTelephone: toLines(entry.contact?.['contact-telephone']),
    activity: labelsFor(additionalBusinessActivityItems, entry.activity)
  }
}
