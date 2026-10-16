import { additionalAddressLines } from '#/server/common/helpers/answer-lines.js'

export function buildLatestAddress(additionalAddresses = []) {
  const entry = additionalAddresses.at(-1)

  if (!entry) {
    return null
  }

  return {
    number: additionalAddresses.length,
    ...additionalAddressLines(entry)
  }
}
