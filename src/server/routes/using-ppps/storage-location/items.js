import { businessAddressLines } from '#/server/common/helpers/answer-lines.js'

export const MAIN_ADDRESS = 'main-address'
export const ANOTHER_ADDRESS = 'another-address'

export const storageLocationValues = [MAIN_ADDRESS, ANOTHER_ADDRESS]

// The main address option names the business address saved earlier (its first
// line, in or outside Great Britain), so the items are built from the answers
// rather than fixed.
export function storageLocationItemsFor(formSession = {}) {
  const [addressLine1] = businessAddressLines(formSession.address)

  return [
    {
      value: MAIN_ADDRESS,
      text: addressLine1 ? `At ${addressLine1}` : 'At the main business address'
    },
    {
      value: ANOTHER_ADDRESS,
      text: 'Another address'
    }
  ]
}
