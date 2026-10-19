import { getSession } from '#/server/common/helpers/get-session.js'

// Shows the addresses found for the search and saves the chosen one as
// `address` (see ./select). The lookup behind it is still a stub.
export const ADDRESS_SELECT_PAGE = '/business-address/select'

// The postcode and building searched for. It's only needed to run the lookup,
// so it's kept out of `formSession`, which is sent to the backend as the answers.
export const ADDRESS_SEARCH_KEY = 'addressSearch'

// Lets someone type the address in instead of using the lookup (see ./manual).
export const ADDRESS_MANUAL_PAGE = '/business-address/manual'

// Keeps `?change=true`, so an address entered from check answers stays in change mode.
export const manualPageFor = (request) => `${ADDRESS_MANUAL_PAGE}${request.url.search}`

export const searchPageContext = (request) => ({
  manualAddressPage: manualPageFor(request)
})

export const get = {
  handler(request, h) {
    request.yar.set('formSession', getSession(request, 'formSession'))

    return h.view('qualifying-questions/business-address/index', {
      ...searchPageContext(request),
      values: request.yar.get(ADDRESS_SEARCH_KEY)
    })
  }
}

export const post = {
  handler(request, h) {
    request.yar.set(ADDRESS_SEARCH_KEY, request.payload)

    return h.redirect(`${ADDRESS_SELECT_PAGE}${request.url.search}`)
  }
}
