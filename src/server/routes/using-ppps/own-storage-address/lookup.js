import {
  OWN_STORAGE_ADDRESS_MANUAL_PAGE,
  OWN_STORAGE_ADDRESS_PAGE,
  OWN_STORAGE_ADDRESS_SELECT_PAGE,
  STORAGE_ADDRESSES_PAGE,
  STORAGE_LOCATION_PAGE
} from '#/server/common/helpers/journey.js'
import {
  OWN_STORAGE_ADDRESS_SEARCH_KEY,
  USING_PPPS_KEY
} from '#/server/common/constants/session-keys.js'
import {
  addressSearchPage,
  addressSelectPage
} from '#/server/common/helpers/address-lookup-pages.js'
import {
  getUsingPPPsAnswers,
  setUsingPPPsAnswer
} from '#/server/common/helpers/using-ppps-answers.js'

export const OWN_STORAGE_ADDRESS_HEADING = 'What is the location where you store PPPs?'

const OWN_STORAGE_ADDRESS_INTRO =
  "If PPPs are stored at a location without its own postcode, use the nearest associated postcode. You'll be able to enter the address details manually if needed."

// The own storage addresses are a list, added to one at a time by this lookup
// (or the manual page) and shown on the storage addresses page.
export const readOwnStorageAddresses = (formSession) =>
  getUsingPPPsAnswers(formSession)['ownStorageAddresses'] ?? []

// An empty list isn't kept, so the journey asks for an address again.
export function saveOwnStorageAddresses(formSession, addresses) {
  if (addresses.length) {
    setUsingPPPsAnswer(formSession, 'ownStorageAddresses', addresses)
    return
  }

  const { ownStorageAddresses, ...others } = getUsingPPPsAnswers(formSession)
  formSession[USING_PPPS_KEY] = others
}

export const addOwnStorageAddress = (formSession, address) =>
  saveOwnStorageAddresses(formSession, [...readOwnStorageAddresses(formSession), address])

// Keeps change mode (from check answers) but nothing else from the query.
export const changeQuery = (request) => (request.query?.change === 'true' ? '?change=true' : '')

export const storageAddressesPage = (request) => `${STORAGE_ADDRESSES_PAGE}${changeQuery(request)}`

const ownStorageAddressLookup = {
  searchPage: OWN_STORAGE_ADDRESS_PAGE,
  selectPage: OWN_STORAGE_ADDRESS_SELECT_PAGE,
  manualPage: OWN_STORAGE_ADDRESS_MANUAL_PAGE,
  searchKey: OWN_STORAGE_ADDRESS_SEARCH_KEY,
  heading: OWN_STORAGE_ADDRESS_HEADING,
  intro: OWN_STORAGE_ADDRESS_INTRO,
  titles: {
    search: OWN_STORAGE_ADDRESS_HEADING,
    select: OWN_STORAGE_ADDRESS_HEADING,
    confirm: OWN_STORAGE_ADDRESS_HEADING,
    noResults: 'No Address Found'
  },
  views: {
    search: 'using-ppps/own-storage-address/index',
    select: 'using-ppps/own-storage-address/select/index'
  },
  // Every search adds a new address, so there's never a saved one to pre-select.
  readAddress: () => undefined,
  saveAddress: addOwnStorageAddress,
  // Back to the list once there's an address on it, otherwise back to where
  // the sites were chosen.
  backLink: (formSession) =>
    readOwnStorageAddresses(formSession).length ? STORAGE_ADDRESSES_PAGE : STORAGE_LOCATION_PAGE,
  afterSave: (request, h) => h.redirect(storageAddressesPage(request))
}

export const searchPage = addressSearchPage(ownStorageAddressLookup)
export const selectPage = addressSelectPage(ownStorageAddressLookup)
