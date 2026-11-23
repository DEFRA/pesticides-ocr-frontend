import { OWN_STORAGE_ADDRESS_SEARCH_KEY } from '#/server/common/constants/session-keys.js'
import { addressLines } from '#/server/common/helpers/answer-lines.js'
import { getSession } from '#/server/common/helpers/get-session.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import {
  getNextPage,
  OWN_STORAGE_ADDRESS_MANUAL_PAGE,
  OWN_STORAGE_ADDRESS_PAGE,
  STORAGE_ADDRESSES_PAGE
} from '#/server/common/helpers/journey.js'
import {
  changeQuery,
  readOwnStorageAddresses,
  saveOwnStorageAddresses,
  storageAddressesPage
} from '../own-storage-address/lookup.js'
import { ADD_ANOTHER } from './items.js'

const VIEW = 'using-ppps/storage-addresses/index'

const searchPage = (request) => `${OWN_STORAGE_ADDRESS_PAGE}${changeQuery(request)}`

// A card per address, numbered from 1 as on check answers.
export function storageAddressesContext(request) {
  const query = changeQuery(request)

  return {
    storageAddresses: readOwnStorageAddresses(getSession(request, 'formSession')).map(
      (address, index) => ({
        number: index + 1,
        lines: addressLines(address),
        changeHref: `${OWN_STORAGE_ADDRESS_MANUAL_PAGE}?address=${index + 1}${query.replace('?', '&')}`
      })
    ),
    removeAction: `${STORAGE_ADDRESSES_PAGE}/remove${query}`
  }
}

export const get = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')
    request.yar.set('formSession', formSession)

    // Nothing to list yet, so straight on to finding the first address.
    if (!readOwnStorageAddresses(formSession).length) {
      return h.redirect(searchPage(request))
    }

    return h.view(VIEW, storageAddressesContext(request))
  }
}

// "Yes" starts a blank search for another address. "No" carries on with the
// journey (or back to check answers in change mode). The choice isn't an
// answer, so it isn't saved.
export const post = {
  handler(request, h) {
    if (request.payload['addAnother'] === ADD_ANOTHER) {
      request.yar.clear(OWN_STORAGE_ADDRESS_SEARCH_KEY)

      return h.redirect(searchPage(request))
    }

    const formSession = getSession(request, 'formSession')

    return redirectToNextPage(request, h, getNextPage(STORAGE_ADDRESSES_PAGE, formSession))
  }
}

// Removes the address straight away. Once the last one has gone, it's back to
// the search for a new one.
export const remove = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')
    const addresses = readOwnStorageAddresses(formSession)
    const index = request.payload['address'] - 1

    if (index < addresses.length) {
      saveOwnStorageAddresses(
        formSession,
        addresses.filter((_address, position) => position !== index)
      )
      request.yar.set('formSession', formSession)
    }

    return h.redirect(
      readOwnStorageAddresses(formSession).length ? storageAddressesPage(request) : searchPage(request)
    )
  }
}
