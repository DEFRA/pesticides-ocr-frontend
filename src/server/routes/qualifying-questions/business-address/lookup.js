import {
  ADDRESS_MANUAL_PAGE,
  ADDRESS_SEARCH_PAGE,
  ADDRESS_SELECT_PAGE
} from '#/server/common/constants/address-pages.js'
import { ADDRESS_SEARCH_KEY } from '#/server/common/constants/session-keys.js'
import {
  addressSearchPage,
  addressSelectPage
} from '#/server/common/helpers/address-lookup-pages.js'

// The business address's lookup (see common/helpers/address-lookup-pages.js).
const businessAddressLookup = {
  searchPage: ADDRESS_SEARCH_PAGE,
  selectPage: ADDRESS_SELECT_PAGE,
  manualPage: ADDRESS_MANUAL_PAGE,
  searchKey: ADDRESS_SEARCH_KEY,
  heading: 'What is the main address for your business or organisation?',
  titles: {
    search: 'Business Address',
    select: 'Select Address',
    confirm: 'Confirm Address',
    noResults: 'No Address Found'
  },
  views: {
    search: 'qualifying-questions/business-address/index',
    select: 'qualifying-questions/business-address/select/index'
  },
  readAddress: (formSession) => formSession['address'],
  saveAddress: (formSession, address) => {
    formSession['address'] = address
  }
}

export const searchPage = addressSearchPage(businessAddressLookup)
export const selectPage = addressSelectPage(businessAddressLookup)
