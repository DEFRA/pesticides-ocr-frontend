import { regionItems } from '#/server/common/constants/regions.js'

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
    address['addressPostcode'],
    // The region is a code (england, scotland, wales); the view calls it the country.
    ...labelsFor(regionItems, address['addressRegion'])
  )
}

// A main business address outside Great Britain is kept as the text typed in
// (see business-address/international) rather than as address fields.
export const isInternationalAddress = (address) =>
  typeof address?.['internationalAddress'] === 'string'

// One line per line typed in, with blank lines dropped.
export const internationalAddressLines = (text = '') =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')

// The main business address's lines, whichever way it was given.
export const businessAddressLines = (address = {}) =>
  isInternationalAddress(address)
    ? internationalAddressLines(address['internationalAddress'])
    : addressLines(address)
