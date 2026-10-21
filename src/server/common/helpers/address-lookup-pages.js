// The search and select pages of an address lookup: search by postcode and
// building, then choose from the addresses found (or confirm the only one).
// Each address that's captured this way (the business address, the own
// storage address) passes its own `lookup`:
//
//   searchPage, selectPage, manualPage  the three page paths
//   searchKey     the yar key the search is kept under, out of formSession,
//                 until an address is chosen or entered by hand
//   heading       the question both pages ask
//   titles        { search, select, confirm, noResults } page titles
//   views         { search, select } view paths
//   readAddress(formSession) / saveAddress(formSession, address)
//                 where the chosen address lives in formSession
//
// The search page is the address's JOURNEY entry, so once an address is
// chosen the journey carries on from it.

import Joi from 'joi'
import { findAddresses } from './address-lookup.js'
import { addressLines } from './answer-lines.js'
import { ukPostcode } from './address-fields.js'
import { buildErrorSummary } from './build-error-summary.js'
import { getSession } from './get-session.js'
import { redirectToNextPage } from './journey-navigation.js'
import { getNextPage } from './journey.js'
import { formatPostcode } from './postcode.js'
import { viewFailAction } from './view-fail-action.js'

const BUILDING_MAX_LENGTH = 100
const BUILDING_TOO_LONG_MESSAGE = 'Building name or number must be 100 characters or less'
export const SELECT_ADDRESS_MESSAGE = 'Select an address'

const ADDRESS_FIELDS = [
  'addressLine1',
  'addressLine2',
  'addressTown',
  'addressCounty',
  'addressPostcode',
  'addressRegion'
]

// Keeps `?change=true`, so an address started from check answers stays in change mode.
const withQuery = (page, request) => `${page}${request.url.search}`

export const isSameAddress = (address, other = {}) =>
  ADDRESS_FIELDS.every((field) => (address[field] ?? '') === (other[field] ?? ''))

const addressesFound = (count) => `${count} ${count === 1 ? 'address' : 'addresses'} found`

// The dropdown values are positions in this list, so the chosen address is
// always looked up again rather than taken from the form.
const lookUpAddresses = (addressSearch) =>
  findAddresses({
    postcode: addressSearch['addressPostcode'],
    building: addressSearch['addressBuilding']
  })

export function addressSearchPage(lookup) {
  const searchContext = (request) => ({
    heading: lookup.heading,
    manualAddressPage: withQuery(lookup.manualPage, request)
  })

  return {
    app: { pageTitle: lookup.titles.search },

    validate: {
      payload: Joi.object({
        addressPostcode: ukPostcode,
        addressBuilding: Joi.string().trim().allow('').max(BUILDING_MAX_LENGTH).messages({
          'string.max': BUILDING_TOO_LONG_MESSAGE
        })
      }),
      failAction: viewFailAction(lookup.views.search, searchContext)
    },

    get: {
      handler(request, h) {
        request.yar.set('formSession', getSession(request, 'formSession'))

        return h.view(lookup.views.search, {
          ...searchContext(request),
          values: request.yar.get(lookup.searchKey)
        })
      }
    },

    post: {
      handler(request, h) {
        request.yar.set(lookup.searchKey, request.payload)

        return h.redirect(withQuery(lookup.selectPage, request))
      }
    }
  }
}

const redirectToSearch = (lookup, request, h) => h.redirect(withQuery(lookup.searchPage, request))

function renderSelectPage(lookup, request, h, { addressSearch, addresses, selected, errorSummary }) {
  const searchPage = withQuery(lookup.searchPage, request)
  const titles = {
    0: lookup.titles.noResults,
    1: lookup.titles.confirm
  }

  return h.view(lookup.views.select, {
    ...errorSummary,
    pageTitle: titles[addresses.length] ?? lookup.titles.select,
    heading: lookup.heading,
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
    // With one address there's nothing to choose, so the page only asks to confirm it.
    foundAddressLines: addresses.length === 1 ? addressLines(addresses[0]) : [],
    postcode: formatPostcode(addressSearch['addressPostcode']),
    building: addressSearch['addressBuilding'],
    searchPage,
    manualAddressPage: withQuery(lookup.manualPage, request),
    // The journey's back link goes to check answers in change mode; this page
    // goes back to the search instead, which keeps change mode itself.
    backLink: searchPage
  })
}

function selectFailAction(lookup) {
  return async (request, h, error) => {
    const addressSearch = request.yar.get(lookup.searchKey)

    if (!addressSearch) {
      return redirectToSearch(lookup, request, h).takeover()
    }

    const addresses = await lookUpAddresses(addressSearch)

    return renderSelectPage(lookup, request, h, {
      addressSearch,
      addresses,
      errorSummary: buildErrorSummary(error)
    }).takeover()
  }
}

export function addressSelectPage(lookup) {
  return {
    app: { pageTitle: lookup.titles.select },

    validate: {
      payload: Joi.object({
        address: Joi.string()
          .pattern(/^\d+$/)
          .required()
          .messages({
            'any.required': SELECT_ADDRESS_MESSAGE,
            'string.base': SELECT_ADDRESS_MESSAGE,
            'string.empty': SELECT_ADDRESS_MESSAGE,
            'string.pattern.base': SELECT_ADDRESS_MESSAGE
          })
      }),
      failAction: selectFailAction(lookup)
    },

    get: {
      async handler(request, h) {
        const formSession = getSession(request, 'formSession')
        request.yar.set('formSession', formSession)

        const addressSearch = request.yar.get(lookup.searchKey)

        if (!addressSearch) {
          return redirectToSearch(lookup, request, h)
        }

        const addresses = await lookUpAddresses(addressSearch)
        const savedIndex = addresses.findIndex((address) =>
          isSameAddress(address, lookup.readAddress(formSession))
        )

        return renderSelectPage(lookup, request, h, {
          addressSearch,
          addresses,
          selected: savedIndex === -1 ? undefined : String(savedIndex)
        })
      }
    },

    post: {
      async handler(request, h) {
        const formSession = getSession(request, 'formSession')
        const addressSearch = request.yar.get(lookup.searchKey)

        if (!addressSearch) {
          return redirectToSearch(lookup, request, h)
        }

        const addresses = await lookUpAddresses(addressSearch)
        const address = addresses[Number(request.payload['address'])]

        if (!address) {
          return renderSelectPage(lookup, request, h, {
            addressSearch,
            addresses,
            errorSummary: buildErrorSummary([{ path: ['address'], message: SELECT_ADDRESS_MESSAGE }])
          })
        }

        lookup.saveAddress(formSession, address)
        request.yar.set('formSession', formSession)
        // The search was only needed to find the address, so it isn't kept.
        request.yar.clear(lookup.searchKey)

        return redirectToNextPage(request, h, getNextPage(lookup.searchPage, formSession))
      }
    }
  }
}
