import { ADDRESS_SEARCH_KEY } from '#/server/common/constants/session-keys.js'
import {
  ADDRESS_MANUAL_PAGE,
  ADDRESS_SEARCH_PAGE
} from '#/server/common/constants/address-pages.js'
import { getSession } from '#/server/common/helpers/get-session.js'
import { redirectToNextPage } from '#/server/common/helpers/journey-navigation.js'
import { getNextPage } from '#/server/common/helpers/journey.js'

// The journey's back link goes to check answers in change mode; this page goes
// back to the manual address page instead, which keeps change mode itself.
export const internationalPageContext = (request) => ({
  backLink: `${ADDRESS_MANUAL_PAGE}${request.url.search}`
})

export const get = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')
    request.yar.set('formSession', formSession)

    return h.view('qualifying-questions/business-address/international/index', {
      ...internationalPageContext(request),
      values: { internationalAddress: formSession['address']?.['internationalAddress'] }
    })
  }
}

// Saves the same `address` answer as the lookup and the manual page, replacing
// any address in Great Britain, so the journey carries on from the business
// address page either way.
export const post = {
  handler(request, h) {
    const formSession = getSession(request, 'formSession')

    formSession['address'] = { internationalAddress: request.payload['internationalAddress'] }
    request.yar.set('formSession', formSession)
    request.yar.clear(ADDRESS_SEARCH_KEY)

    return redirectToNextPage(request, h, getNextPage(ADDRESS_SEARCH_PAGE, formSession))
  }
}
