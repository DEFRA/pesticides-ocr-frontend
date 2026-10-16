import { additionalBusinessActivityItems } from '#/server/routes/pro-users/additional-business-activity/items.js'

export function toLines(...values) {
  return values.filter((value) => value !== undefined && value !== '')
}

export function labelsFor(items, values) {
  return toLines(...[values ?? []].flat())
    .map((value) => items.find((item) => item.value === value)?.text ?? value)
}

export function addressLines(address = {}) {
  return toLines(
    address['addressLine1'],
    address['addressLine2'],
    address['addressTown'],
    address['addressCounty'],
    address['addressPostcode']
  )
}

export function additionalAddressLines(entry = {}) {
  return {
    address: addressLines(entry.address),
    contactName: toLines(entry.contact?.['contactName']),
    contactEmail: toLines(entry.contact?.['contactEmail']),
    contactTelephone: toLines(entry.contact?.['contactTelephone']),
    activity: labelsFor(additionalBusinessActivityItems, entry.activity)
  }
}
