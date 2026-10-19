export function formatPostcode(postcode = '') {
  const compact = postcode.replaceAll(/\s+/g, '').toUpperCase()

  return compact.length > 3 ? `${compact.slice(0, -3)} ${compact.slice(-3)}` : compact
}
