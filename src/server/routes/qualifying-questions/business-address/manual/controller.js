import { getSession } from '#/server/common/helpers/get-session.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { getNextPage } from '#/server/common/helpers/journey.js'
import {
  ADDRESS_SEARCH_PAGE,
  INTERNATIONAL_ADDRESS_PAGE
} from '#/server/common/constants/address-pages.js'

// The journey's back link goes to check answers in change mode; this page goes
// back to the search instead, which keeps change mode itself.
export const manualPageContext = (request) => ({
  backLink: `${ADDRESS_SEARCH_PAGE}${request.url.search}`,
  internationalAddressPage: INTERNATIONAL_ADDRESS_PAGE
})

export const get = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')
    request.yar.set('formSession', formSession)

    return h.view('qualifying-questions/business-address/manual/index', {
      ...manualPageContext(request),
      values: formSession['address']
    })
  }
}

// Saves the same `address` answer as the lookup, so the journey carries on
// from the business address page either way.
export const post = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')

    formSession['address'] = request.payload
    request.yar.set('formSession', formSession)

    return redirectToNextPage(request, h, getNextPage(ADDRESS_SEARCH_PAGE, formSession))
  }
}
