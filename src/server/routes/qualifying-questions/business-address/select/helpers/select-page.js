import { findAddresses } from '#/server/common/helpers/address-lookup.js'
import { addressLines } from '#/server/common/helpers/answer-lines.js'
import { buildErrorSummary } from '#/server/common/helpers/build-error-summary.js'
import { getSession } from '#/server/common/helpers/get-session.js'
import { isChangeMode } from '#/server/common/helpers/journey-navigation.js'
import { CHECK_ANSWERS_PAGE, getPreviousPage } from '#/server/common/helpers/journey.js'
import { formatPostcode } from '#/server/common/helpers/postcode.js'

export const ADDRESS_SEARCH_PAGE = '/business-address'

const NO_RESULTS_TITLE = 'No Address Found'
const CONFIRM_TITLE = 'Confirm Address'

const ADDRESS_FIELDS = [
  'addressLine1',
  'addressLine2',
  'addressTown',
  'addressCounty',
  'addressPostcode'
]

// Keeps `?change=true`, so a search started from check answers stays in change mode.
const searchPageFor = (request) => `${ADDRESS_SEARCH_PAGE}${request.url.search}`

export const getAddressSearch = (request) => getSession(request, 'formSession')['addressSearch']

export const redirectToSearch = (request, h) => h.redirect(searchPageFor(request))

// The dropdown values are positions in this list, so the chosen address is always
// looked up again here rather than taken from the form.
export const lookUpAddresses = (addressSearch) =>
  findAddresses({
    postcode: addressSearch['addressPostcode'],
    building: addressSearch['addressBuilding']
  })

const addressesFound = (count) => `${count} ${count === 1 ? 'address' : 'addresses'} found`

export const isSameAddress = (address, other = {}) =>
  ADDRESS_FIELDS.every((field) => (address[field] ?? '') === (other[field] ?? ''))

// With one address there is nothing to choose, so the page only asks to confirm
// it and goes back to the page before the search, as the search page itself does.
const journeyBackLink = (request) =>
  isChangeMode(request)
    ? CHECK_ANSWERS_PAGE
    : getPreviousPage(ADDRESS_SEARCH_PAGE, getSession(request, 'formSession'))

function confirmState(request, addresses) {
  return addresses.length === 1
    ? {
        pageTitle: CONFIRM_TITLE,
        foundAddressLines: addressLines(addresses[0]),
        backLink: journeyBackLink(request)
      }
    : {}
}

export function renderSelectPage(request, h, { addressSearch, addresses, selected, errorSummary }) {
  const searchPage = searchPageFor(request)

  return h.view('qualifying-questions/business-address/select/index', {
    ...errorSummary,
    ...(addresses.length === 0 && { pageTitle: NO_RESULTS_TITLE }),
    addressCount: addresses.length,
    // The first option only says how many were found. Its empty value fails
    // validation, so it can't be submitted as an answer.
    addressItems: [
      { value: '', text: addressesFound(addresses.length) },
      ...addresses.map((address, index) => ({
        value: String(index),
        text: addressLines(address).join(', '),
        selected: String(index) === selected
      }))
    ],
    postcode: formatPostcode(addressSearch['addressPostcode']),
    building: addressSearch['addressBuilding'],
    searchPage,
    // The journey's back link goes to check answers in change mode; this page
    // goes back to the search instead, which keeps change mode itself.
    backLink: searchPage,
    ...confirmState(request, addresses)
  })
}

export async function selectFailAction(request, h, error) {
  const addressSearch = getAddressSearch(request)

  if (!addressSearch) {
    return redirectToSearch(request, h).takeover()
  }

  const addresses = await lookUpAddresses(addressSearch)

  return renderSelectPage(request, h, {
    addressSearch,
    addresses,
    errorSummary: buildErrorSummary(error)
  }).takeover()
}
