import { getSession } from '#/server/common/helpers/get-session.js'
import { ADDRESS_SEARCH_KEY } from '#/server/common/constants/session-keys.js'
import { ADDRESS_MANUAL_PAGE, ADDRESS_SELECT_PAGE } from '#/server/common/constants/address-pages.js'

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
