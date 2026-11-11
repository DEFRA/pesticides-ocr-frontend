export function formatPostcode(postcode = '') {
  const postcodeSliceSize = 3

  const compact = postcode.replaceAll(/\s+/g, '').toUpperCase()

  return compact.length > postcodeSliceSize ? `${compact.slice(0, -postcodeSliceSize)} ${compact.slice(-postcodeSliceSize)}` : compact
}
