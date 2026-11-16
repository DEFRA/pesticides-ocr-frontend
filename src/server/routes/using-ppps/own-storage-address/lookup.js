import {
  OWN_STORAGE_ADDRESS_MANUAL_PAGE,
  OWN_STORAGE_ADDRESS_PAGE,
  OWN_STORAGE_ADDRESS_SELECT_PAGE
} from '#/server/common/helpers/journey.js'
import { OWN_STORAGE_ADDRESS_SEARCH_KEY } from '#/server/common/constants/session-keys.js'
import {
  addressSearchPage,
  addressSelectPage
} from '#/server/common/helpers/address-lookup-pages.js'
import {
  getUsingPPPsAnswers,
  setUsingPPPsAnswer
} from '#/server/common/helpers/using-ppps-answers.js'

export const OWN_STORAGE_ADDRESS_HEADING = 'What is the location where you store PPPs?'

export const readOwnStorageAddress = (formSession) =>
  getUsingPPPsAnswers(formSession)['ownStorageAddress']

export const saveOwnStorageAddress = (formSession, address) =>
  setUsingPPPsAnswer(formSession, 'ownStorageAddress', address)

const ownStorageAddressLookup = {
  searchPage: OWN_STORAGE_ADDRESS_PAGE,
  selectPage: OWN_STORAGE_ADDRESS_SELECT_PAGE,
  manualPage: OWN_STORAGE_ADDRESS_MANUAL_PAGE,
  searchKey: OWN_STORAGE_ADDRESS_SEARCH_KEY,
  heading: OWN_STORAGE_ADDRESS_HEADING,
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
  readAddress: readOwnStorageAddress,
  saveAddress: saveOwnStorageAddress
}

export const searchPage = addressSearchPage(ownStorageAddressLookup)
export const selectPage = addressSelectPage(ownStorageAddressLookup)
