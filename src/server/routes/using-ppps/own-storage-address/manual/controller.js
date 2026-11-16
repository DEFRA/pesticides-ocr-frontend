import { OWN_STORAGE_ADDRESS_SEARCH_KEY } from '#/server/common/constants/session-keys.js'
import { getSession } from '#/server/common/helpers/get-session.js'
import { OWN_STORAGE_ADDRESS_PAGE } from '#/server/common/helpers/journey.js'
import {
  OWN_STORAGE_ADDRESS_HEADING,
  addOwnStorageAddress,
  readOwnStorageAddresses,
  saveOwnStorageAddresses,
  storageAddressesPage
} from '../lookup.js'

// `?address=2` changes the second address on the list (from its Change link).
// Without it, the address entered is added to the list.
function editing(request, formSession) {
  if (request.query?.address === undefined) {
    return { adding: true }
  }

  const index = Number(request.query.address) - 1
  const addresses = readOwnStorageAddresses(formSession)

  return Number.isInteger(index) && index >= 0 && index < addresses.length
    ? { index, address: addresses[index] }
    : { missing: true }
}

// The journey's back link goes to check answers in change mode. Adding an
// address goes back to the search, and changing one back to the list; both
// keep change mode themselves.
export const manualPageContext = (request) => ({
  heading: OWN_STORAGE_ADDRESS_HEADING,
  backLink:
    request.query?.address === undefined
      ? `${OWN_STORAGE_ADDRESS_PAGE}${request.url.search}`
      : storageAddressesPage(request)
})

export const get = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')
    request.yar.set('formSession', formSession)

    const { missing, address } = editing(request, formSession)

    // An address that's no longer on the list (say, removed in another tab).
    if (missing) {
      return h.redirect(storageAddressesPage(request))
    }

    return h.view('using-ppps/own-storage-address/manual/index', {
      ...manualPageContext(request),
      values: address
    })
  }
}

// Adds to (or changes) the same list as the lookup, then back to the list.
export const post = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')
    const { adding, index } = editing(request, formSession)

    if (adding) {
      addOwnStorageAddress(formSession, request.payload)
    } else if (index !== undefined) {
      saveOwnStorageAddresses(
        formSession,
        readOwnStorageAddresses(formSession).with(index, request.payload)
      )
    }

    request.yar.set('formSession', formSession)
    request.yar.clear(OWN_STORAGE_ADDRESS_SEARCH_KEY)

    return h.redirect(storageAddressesPage(request))
  }
}
